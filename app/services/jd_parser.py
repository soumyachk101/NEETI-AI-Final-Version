"""
JD Parser Service — Extracts structured role profiles from job descriptions.
Uses Ollama (qwen2.5:7b) in JSON mode for zero-cost parsing.
"""
import json
from typing import Optional

from app.services.ai_service import ai_service
from app.services.skill_taxonomy import (
    RoleProfile,
    get_competency_distribution,
    get_seniority_thresholds,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

# Redis cache TTL for parsed profiles (24 hours)
JD_CACHE_TTL = 86400

JD_PARSE_PROMPT = """Analyze the following job description and extract structured information.

JOB DESCRIPTION:
{jd_text}

Return a JSON object with EXACTLY these fields:
{{
  "role_title": "exact job title from the JD",
  "seniority": "one of: junior, mid, senior, lead, principal",
  "department": "one of: engineering, data, product, design, devops, security, qa",
  "required_skills": ["list", "of", "required", "technical", "skills"],
  "preferred_skills": ["list", "of", "nice-to-have", "skills"],
  "key_responsibilities": ["top 3-5 responsibilities from the JD"],
  "evaluation_focus": "A 1-2 sentence instruction for how to evaluate candidates for this specific role. What should the interviewer prioritize?"
}}

Rules:
- Extract ONLY what's explicitly stated in the JD
- For seniority, infer from title and requirements if not stated explicitly
- Skills should be individual technologies/concepts, not phrases
- Keep evaluation_focus specific to the role, not generic
"""

JD_PARSE_SYSTEM = (
    "You are an expert HR tech analyst. Extract structured data from job descriptions. "
    "Return ONLY valid JSON, no markdown, no explanation."
)


class JDParserService:
    """Parses job descriptions into structured RoleProfile objects."""

    async def parse(self, jd_text: str) -> Optional[RoleProfile]:
        """
        Parse a raw job description into a structured RoleProfile.

        Args:
            jd_text: Raw job description text

        Returns:
            RoleProfile if parsing succeeds, None if it fails
        """
        if not jd_text or len(jd_text.strip()) < 20:
            logger.debug("JD text too short, skipping parse")
            return None

        try:
            prompt = JD_PARSE_PROMPT.format(jd_text=jd_text[:3000])

            raw_response = await ai_service.generate_completion(
                prompt=prompt,
                system_prompt=JD_PARSE_SYSTEM,
                temperature=0.1,
                max_tokens=600,
                json_mode=True,
            )

            profile = self._parse_response(raw_response)
            if profile:
                logger.info(
                    f"JD parsed: role={profile.role_title}, "
                    f"seniority={profile.seniority}, "
                    f"skills={len(profile.required_skills)}"
                )
            return profile

        except Exception as e:
            logger.warning(f"JD parsing failed: {e}")
            return None

    def _parse_response(self, raw: str) -> Optional[RoleProfile]:
        """Parse LLM JSON response into RoleProfile."""
        try:
            # Clean response — strip markdown fences if present
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]

            data = json.loads(cleaned)

            # Normalize seniority
            seniority = data.get("seniority", "mid").lower().strip()
            if seniority not in ("junior", "mid", "senior", "lead", "principal"):
                seniority = self._infer_seniority(data.get("role_title", ""))

            return RoleProfile(
                role_title=data.get("role_title", ""),
                seniority=seniority,
                department=data.get("department", "engineering"),
                required_skills=[
                    s.strip() for s in data.get("required_skills", [])
                    if isinstance(s, str) and s.strip()
                ][:15],
                preferred_skills=[
                    s.strip() for s in data.get("preferred_skills", [])
                    if isinstance(s, str) and s.strip()
                ][:10],
                key_responsibilities=[
                    r.strip() for r in data.get("key_responsibilities", [])
                    if isinstance(r, str) and r.strip()
                ][:5],
                evaluation_focus=data.get("evaluation_focus", ""),
            )

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Failed to parse JD response as JSON: {e}")
            return None

    def _infer_seniority(self, title: str) -> str:
        """Infer seniority from job title if not explicitly stated."""
        t = title.lower()
        if any(w in t for w in ("principal", "staff", "distinguished")):
            return "principal"
        if any(w in t for w in ("lead", "head", "director", "vp")):
            return "lead"
        if any(w in t for w in ("senior", "sr.", "sr ")):
            return "senior"
        if any(w in t for w in ("junior", "jr.", "jr ", "intern", "associate", "entry")):
            return "junior"
        return "mid"

    def profile_to_dict(self, profile: RoleProfile) -> dict:
        """Convert RoleProfile to a JSON-serializable dict for DB storage."""
        return {
            "role_title": profile.role_title,
            "seniority": profile.seniority,
            "department": profile.department,
            "required_skills": profile.required_skills,
            "preferred_skills": profile.preferred_skills,
            "key_responsibilities": profile.key_responsibilities,
            "evaluation_focus": profile.evaluation_focus,
            "competency_distribution": get_competency_distribution(
                profile.required_skills + profile.preferred_skills
            ),
            "seniority_thresholds": get_seniority_thresholds(profile.seniority),
        }


# Module-level singleton
jd_parser = JDParserService()
