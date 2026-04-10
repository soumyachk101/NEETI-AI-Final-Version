"""
LangGraph Agent Orchestration — Phase 3

Replaces Celery chord with a stateful LangGraph for the evaluation pipeline.
InterviewState flows through all nodes; no redundant DB round-trips.
Existing agent classes are wrapped — zero refactor of agent logic.
"""
import asyncio
from typing import Any, Optional, Annotated
from datetime import datetime

from langgraph.graph import StateGraph, START, END

from app.agents.base import AgentInput, AgentOutput
from app.agents.coding_agent import CodingAgent
from app.agents.speech_agent import SpeechAgent
from app.agents.vision_agent import VisionAgent
from app.agents.reasoning_agent import ReasoningAgent
from app.agents.evaluation_agent import EvaluationAgent
from app.models.models import (
    AgentOutput as AgentOutputModel,
    AgentType,
    Evaluation,
    Session,
)
from app.core.database import AsyncSessionLocal
from app.core.events import publish_agent_completed
from app.core.logging import get_logger
from sqlalchemy import select

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# State definition
# ---------------------------------------------------------------------------

def _merge_dict(a: dict, b: dict) -> dict:
    """Reducer: merge dicts (b overwrites a)."""
    merged = {**a}
    merged.update(b)
    return merged


def _merge_list(a: list, b: list) -> list:
    """Reducer: concatenate lists."""
    return a + b


class InterviewState(dict):
    """
    Shared state that flows through the entire LangGraph.

    Keys:
        session_id (int): The interview session ID.
        job_description (str): Raw JD text from session.
        jd_profile (dict): Parsed role profile.
        coding_output (dict): CodingAgent findings.
        speech_output (dict): SpeechAgent findings.
        vision_output (dict): VisionAgent findings.
        reasoning_output (dict): ReasoningAgent findings.
        anomaly_result (dict): Anomaly analysis from CodingAgent.
        final_evaluation (dict): EvaluationAgent output.
        agent_scores (dict): Score map for all agents.
        errors (list): Non-fatal errors collected during execution.
    """
    pass


# ---------------------------------------------------------------------------
# Node: Load session context (JD profile)
# ---------------------------------------------------------------------------

async def load_session_context(state: dict) -> dict:
    """Entry node: load JD profile from the session record."""
    session_id = state["session_id"]

    jd_profile = {}
    job_description = ""

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Session.job_description, Session.jd_profile)
                .where(Session.id == session_id)
            )
            row = result.first()
            if row:
                job_description = row[0] or ""
                jd_profile = row[1] or {}
    except Exception as e:
        logger.warning(f"Failed to load session context for {session_id}: {e}")

    logger.info(
        f"[Graph] Session {session_id} context loaded — "
        f"JD: {'yes' if job_description else 'no'}, "
        f"profile: {jd_profile.get('role_title', 'none')}"
    )

    return {
        **state,
        "job_description": job_description,
        "jd_profile": jd_profile,
    }


# ---------------------------------------------------------------------------
# Node helpers: wrap an existing agent + persist output
# ---------------------------------------------------------------------------

async def _run_agent_node(
    agent_cls: type,
    agent_type: AgentType,
    state: dict,
    output_key: str,
) -> dict:
    """Generic wrapper: instantiate agent, run, persist to DB, return state update."""
    session_id = state["session_id"]
    errors: list[str] = []

    try:
        agent = agent_cls()
        input_data = AgentInput(
            session_id=session_id,
            data={"jd_profile": state.get("jd_profile", {})},
        )
        output: AgentOutput = await agent.run(input_data)

        # Persist to DB
        async with AsyncSessionLocal() as db:
            db_output = AgentOutputModel(
                session_id=session_id,
                agent_type=agent_type,
                status=output.status,
                score=output.score,
                findings=output.findings,
                flags=output.flags,
                insights=output.insights,
                error_message=output.error_message,
            )
            db.add(db_output)
            await db.commit()
            await db.refresh(db_output)

            await publish_agent_completed(
                session_id=session_id,
                agent_type=agent_type.value,
                output_id=db_output.id,
            )

        update = {
            output_key: output.model_dump(),
            "agent_scores": {
                **state.get("agent_scores", {}),
                agent_type.value: output.score,
            },
        }

        # Extract anomaly data from coding agent
        if output_key == "coding_output" and output.findings:
            update["anomaly_result"] = {
                "probability": output.findings.get("anomaly_probability"),
                "mode": output.findings.get("anomaly_mode"),
                "evidence": output.findings.get("anomaly_evidence", []),
                "features": output.findings.get("behavioral_features", {}),
            }

        return {**state, **update}

    except Exception as e:
        logger.error(f"[Graph] {agent_type.value} agent failed for session {session_id}: {e}")
        errors.append(f"{agent_type.value}: {str(e)}")
        return {
            **state,
            output_key: {"error": str(e)},
            "errors": state.get("errors", []) + errors,
        }


# ---------------------------------------------------------------------------
# Individual agent nodes
# ---------------------------------------------------------------------------

async def coding_node(state: dict) -> dict:
    """Run CodingAgent and return updated state."""
    return await _run_agent_node(CodingAgent, AgentType.CODING, state, "coding_output")


async def speech_node(state: dict) -> dict:
    """Run SpeechAgent and return updated state."""
    return await _run_agent_node(SpeechAgent, AgentType.SPEECH, state, "speech_output")


async def vision_node(state: dict) -> dict:
    """Run VisionAgent and return updated state."""
    return await _run_agent_node(VisionAgent, AgentType.VISION, state, "vision_output")


async def reasoning_node(state: dict) -> dict:
    """Run ReasoningAgent and return updated state."""
    return await _run_agent_node(ReasoningAgent, AgentType.REASONING, state, "reasoning_output")


# ---------------------------------------------------------------------------
# Fan-out node: runs all 4 agents in parallel
# ---------------------------------------------------------------------------

async def parallel_agents_node(state: dict) -> dict:
    """Run all 4 analysis agents concurrently."""
    session_id = state["session_id"]
    logger.info(f"[Graph] Running 4 agents in parallel for session {session_id}")

    results = await asyncio.gather(
        coding_node(state),
        speech_node(state),
        vision_node(state),
        reasoning_node(state),
        return_exceptions=True,
    )

    # Merge all results into one state
    merged = {**state}
    for result in results:
        if isinstance(result, Exception):
            merged.setdefault("errors", []).append(str(result))
        elif isinstance(result, dict):
            for key in [
                "coding_output", "speech_output", "vision_output",
                "reasoning_output", "anomaly_result", "agent_scores",
            ]:
                if key in result:
                    if key == "agent_scores":
                        merged["agent_scores"] = {
                            **merged.get("agent_scores", {}),
                            **result["agent_scores"],
                        }
                    elif key == "errors":
                        merged.setdefault("errors", []).extend(result.get("errors", []))
                    else:
                        merged[key] = result[key]

    logger.info(f"[Graph] All agents complete for session {session_id}")
    return merged


# ---------------------------------------------------------------------------
# Evaluation node
# ---------------------------------------------------------------------------

async def evaluation_node(state: dict) -> dict:
    """Run EvaluationAgent and persist final evaluation."""
    session_id = state["session_id"]

    try:
        agent = EvaluationAgent()
        input_data = AgentInput(
            session_id=session_id,
            data={"jd_profile": state.get("jd_profile", {})},
        )
        output: AgentOutput = await agent.run(input_data)

        # Persist agent output
        async with AsyncSessionLocal() as db:
            db_output = AgentOutputModel(
                session_id=session_id,
                agent_type=AgentType.EVALUATION,
                status=output.status,
                score=output.score,
                findings=output.findings,
                flags=output.flags,
                insights=output.insights,
                error_message=output.error_message,
            )
            db.add(db_output)

            # Extract anomaly data
            anomaly = state.get("anomaly_result", {})
            findings = output.findings or {}

            evaluation = Evaluation(
                session_id=session_id,
                overall_score=output.score or 0.0,
                coding_score=findings.get("coding_score"),
                communication_score=findings.get("communication_score"),
                engagement_score=findings.get("engagement_score"),
                reasoning_score=findings.get("reasoning_score"),
                recommendation="hire" if output.score and output.score >= 75 else "no_hire",
                confidence_level=0.85,
                strengths=[],
                weaknesses=[],
                key_findings=output.flags,
                summary=output.insights,
                detailed_report=output.insights,
                anomaly_probability=anomaly.get("probability"),
                anomaly_mode=anomaly.get("mode"),
                anomaly_reasons=anomaly.get("evidence", []),
                behavioral_features=anomaly.get("features", {}),
            )
            db.add(evaluation)
            await db.commit()

        logger.info(
            f"[Graph] Evaluation complete for session {session_id}: "
            f"score={output.score}"
        )

        return {
            **state,
            "final_evaluation": output.model_dump(),
        }

    except Exception as e:
        logger.error(f"[Graph] Evaluation failed for session {session_id}: {e}")
        return {
            **state,
            "errors": state.get("errors", []) + [f"evaluation: {str(e)}"],
        }


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_evaluation_graph() -> StateGraph:
    """
    Build the LangGraph evaluation pipeline.

    Flow:
        START → load_context → parallel_agents → evaluation → END
    """
    graph = StateGraph(dict)

    # Add nodes
    graph.add_node("load_context", load_session_context)
    graph.add_node("parallel_agents", parallel_agents_node)
    graph.add_node("evaluation", evaluation_node)

    # Add edges
    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "parallel_agents")
    graph.add_edge("parallel_agents", "evaluation")
    graph.add_edge("evaluation", END)

    return graph


def get_compiled_graph():
    """Get a compiled, ready-to-invoke graph instance."""
    graph = build_evaluation_graph()
    return graph.compile()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def run_evaluation_pipeline(session_id: int) -> dict:
    """
    Run the full evaluation pipeline via LangGraph.
    
    This is the public entry point called from agent_tasks.py
    when USE_LANGGRAPH=True.
    """
    logger.info(f"[LangGraph] Starting evaluation pipeline for session {session_id}")

    compiled = get_compiled_graph()

    initial_state = {
        "session_id": session_id,
        "job_description": "",
        "jd_profile": {},
        "coding_output": {},
        "speech_output": {},
        "vision_output": {},
        "reasoning_output": {},
        "anomaly_result": {},
        "agent_scores": {},
        "final_evaluation": {},
        "errors": [],
    }

    final_state = await compiled.ainvoke(initial_state)

    errors = final_state.get("errors", [])
    if errors:
        logger.warning(f"[LangGraph] Pipeline completed with {len(errors)} errors: {errors}")

    logger.info(
        f"[LangGraph] Pipeline complete for session {session_id} "
        f"— scores: {final_state.get('agent_scores', {})}"
    )

    return final_state
