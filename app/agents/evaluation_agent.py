"""
Evaluation Agent - Combines all agent outputs into final recommendation.
JD-aware: anchors evaluation to the specific role when a JD profile is available.
"""
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.models.models import AgentOutput as AgentOutputModel, AgentType, Session
from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.services.ai_service import ai_service

class EvaluationAgent(BaseAgent):
    """
    Final evaluation agent that:
    - Aggregates all agent outputs
    - Loads JD profile for role-aware evaluation
    - Produces overall hiring recommendation
    - Generates structured report with skill gap analysis
    """
    
    def get_name(self) -> str:
        return "evaluation"
    
    async def process(self, input_data: AgentInput) -> AgentOutput:
        """Generate final evaluation from all agent outputs."""
        session_id = input_data.session_id
        
        # Load agent outputs
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(AgentOutputModel)
                .where(
                    AgentOutputModel.session_id == session_id,
                    AgentOutputModel.status == "completed"
                )
            )
            agent_outputs = result.scalars().all()
            
            # Phase 2: Load JD profile from session
            jd_profile = await self._load_jd_profile(db, session_id)
        
        if not agent_outputs:
            return AgentOutput(
                agent_type=self.agent_type,
                session_id=session_id,
                score=0.0,
                insights="No agent data available for evaluation"
            )
        
        evaluation = self._aggregate_outputs(agent_outputs)
        
        recommendation = self._generate_recommendation(evaluation, jd_profile)
        
        findings = self._extract_key_findings(agent_outputs, evaluation)
        
        insights = await self._generate_comprehensive_insights(
            evaluation, recommendation, agent_outputs, jd_profile
        )
        
        # Add JD profile to evaluation findings for downstream use
        if jd_profile:
            evaluation["jd_profile"] = jd_profile
        
        return AgentOutput(
            agent_type=self.agent_type,
            session_id=session_id,
            score=evaluation["overall_score"],
            findings=evaluation,
            flags=findings["flags"],
            insights=insights
        )
    
    async def _load_jd_profile(
        self, db: AsyncSession, session_id: int
    ) -> Optional[dict[str, Any]]:
        """Load JD profile from the session record."""
        try:
            result = await db.execute(
                select(Session.jd_profile).where(Session.id == session_id)
            )
            profile = result.scalar_one_or_none()
            if profile and isinstance(profile, dict) and profile.get("role_title"):
                logger.info(
                    f"JD profile loaded for session {session_id}: "
                    f"{profile.get('role_title')}"
                )
                return profile
        except Exception as e:
            logger.warning(f"Failed to load JD profile for session {session_id}: {e}")
        return None
    
    def _aggregate_outputs(
        self,
        agent_outputs: list[AgentOutputModel]
    ) -> dict[str, Any]:
        """Aggregate scores from all agents."""
        
        scores = {}
        for output in agent_outputs:
            if output.score is not None:
                scores[output.agent_type.value] = output.score
        
        weights = {
            AgentType.CODING.value: 0.35,
            AgentType.SPEECH.value: 0.20,
            AgentType.VISION.value: 0.15,
            AgentType.REASONING.value: 0.30
        }
        
        overall_score = 0.0
        total_weight = 0.0
        
        for agent_type, score in scores.items():
            weight = weights.get(agent_type, 0.0)
            overall_score += score * weight
            total_weight += weight
        
        if total_weight > 0:
            overall_score /= total_weight
        
        return {
            "overall_score": round(overall_score, 2),
            "coding_score": scores.get(AgentType.CODING.value),
            "communication_score": scores.get(AgentType.SPEECH.value),
            "engagement_score": scores.get(AgentType.VISION.value),
            "reasoning_score": scores.get(AgentType.REASONING.value),
            "agent_count": len(agent_outputs)
        }
    
    def _generate_recommendation(
        self,
        evaluation: dict[str, Any],
        jd_profile: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Generate hiring recommendation — JD-aware when profile available."""
        score = evaluation["overall_score"]
        
        # Phase 2: Use seniority-specific thresholds if JD profile exists
        hire_threshold = 75.0
        maybe_threshold = 60.0
        role_context = ""
        
        if jd_profile:
            thresholds = jd_profile.get("seniority_thresholds", {})
            hire_threshold = thresholds.get("min_score_for_hire", 75.0)
            maybe_threshold = hire_threshold - 15.0
            role_context = f" for {jd_profile.get('role_title', 'this role')}"
        
        if score >= hire_threshold:
            recommendation = "hire"
            confidence = 0.9
            reasoning = f"Candidate meets the performance bar{role_context}."
        elif score >= maybe_threshold:
            recommendation = "maybe"
            confidence = 0.7
            reasoning = f"Candidate shows potential but has gaps{role_context}."
        else:
            recommendation = "no_hire"
            confidence = 0.85
            reasoning = f"Candidate does not meet requirements{role_context}."
        
        return {
            "recommendation": recommendation,
            "confidence": confidence,
            "reasoning": reasoning
        }
    
    def _extract_key_findings(
        self,
        agent_outputs: list[AgentOutputModel],
        evaluation: dict[str, Any]
    ) -> dict[str, Any]:
        """Extract key findings and flags across all agents."""
        
        all_flags = []
        strengths = []
        weaknesses = []
        
        for output in agent_outputs:
            if output.flags:
                for flag in output.flags:
                    flag_copy = dict(flag)
                    flag_copy["agent"] = output.agent_type.value
                    all_flags.append(flag_copy)
            
            if output.score is not None:
                if output.score >= 80:
                    strengths.append(f"Strong {output.agent_type.value} performance")
                elif output.score < 50:
                    weaknesses.append(f"Weak {output.agent_type.value} performance")
        
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        all_flags.sort(key=lambda f: severity_order.get(f.get("severity", "low"), 3))
        
        return {
            "flags": all_flags,
            "strengths": strengths,
            "weaknesses": weaknesses
        }
    
    async def _generate_comprehensive_insights(
        self,
        evaluation: dict[str, Any],
        recommendation: dict[str, Any],
        agent_outputs: list[AgentOutputModel],
        jd_profile: Optional[dict[str, Any]] = None,
    ) -> str:
        """Generate comprehensive natural language insights using AI."""
        
        agent_summaries = []
        for output in agent_outputs:
            agent_summaries.append(
                f"- {output.agent_type.value}: score={output.score}, insights={output.insights}"
            )
        
        # Phase 2: Build JD context block
        jd_context = ""
        if jd_profile:
            jd_parts = [f"\n--- ROLE CONTEXT ---"]
            jd_parts.append(f"Position: {jd_profile.get('role_title', 'Unknown')}")
            jd_parts.append(f"Seniority: {jd_profile.get('seniority', 'mid').upper()}")
            
            required = jd_profile.get("required_skills", [])
            if required:
                jd_parts.append(f"Required Skills: {', '.join(required[:10])}")
            
            responsibilities = jd_profile.get("key_responsibilities", [])
            if responsibilities:
                jd_parts.append("Key Responsibilities:")
                for r in responsibilities[:3]:
                    jd_parts.append(f"  - {r}")
            
            focus = jd_profile.get("evaluation_focus", "")
            if focus:
                jd_parts.append(f"Evaluation Focus: {focus}")
            
            jd_parts.append("--- END ROLE CONTEXT ---\n")
            jd_context = "\n".join(jd_parts)
        
        prompt = f"""Generate a comprehensive interview evaluation report.
{jd_context}
Overall Score: {evaluation['overall_score']:.1f}/100
Recommendation: {recommendation['recommendation'].upper()}
Confidence: {recommendation['confidence']:.0%}

Scores:
- Coding: {evaluation.get('coding_score', 'N/A')}
- Communication: {evaluation.get('communication_score', 'N/A')}
- Reasoning: {evaluation.get('reasoning_score', 'N/A')}
- Engagement: {evaluation.get('engagement_score', 'N/A')}

Agent Analyses:
{chr(10).join(agent_summaries)}

{"Evaluate this candidate SPECIFICALLY against the role requirements listed above. Identify skill gaps between what the role requires and what the candidate demonstrated." if jd_profile else ""}
Write a 4-6 sentence professional evaluation summary covering strengths, weaknesses, and the hiring recommendation with reasoning."""
        
        system_prompt = (
            "You are a senior technical hiring manager writing a final evaluation report. "
            "Be professional, balanced, and data-driven. "
            "When role context is provided, anchor your evaluation to that specific position."
        )
        
        try:
            return (await ai_service.generate_completion(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=500,
            )).strip()
        except Exception as e:
            logger.warning(f"AI insights failed for evaluation agent: {e}")
            parts = [
                f"Overall performance score: {evaluation['overall_score']:.1f}/100.",
                f"Recommendation: {recommendation['recommendation'].upper()}.",
                recommendation["reasoning"],
            ]
            return " ".join(parts)

