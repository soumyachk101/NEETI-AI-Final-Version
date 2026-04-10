"""
Anomaly Service — Multi-signal anomaly detection orchestrator.

Phase 1: Rule engine only (deterministic, zero ML).
Phase 3: Adds Isolation Forest as second signal via shadow mode.

Design:
  - Orchestrates feature extraction → rule evaluation → audit logging.
  - Returns a calibrated probability with confidence band.
  - Never makes a binary decision — the recruiter sets the threshold.
"""
from dataclasses import dataclass, asdict
from typing import Optional

from app.services.feature_store import FeatureStore, BehavioralFeatures, feature_store
from app.services.anomaly_rules import AnomalyRuleEngine, RuleEngineResult, rule_engine
from app.models.models import CodingEvent
from app.core.logging import logger


@dataclass
class AnomalyResult:
    """
    Final anomaly assessment for a session.
    This is what gets stored on the Evaluation record and shown to recruiters.
    """
    probability: float              # 0.0 - 1.0 calibrated score
    confidence_band: tuple[float, float]  # (lower, upper) uncertainty interval
    mode: str                       # "rule_based" | "ml_ensemble"
    triggered_rules: list[dict]     # Rule details for audit trail
    evidence: list[str]             # Human-readable evidence strings
    feature_snapshot: dict          # Exact features used — for audit

    def to_dict(self) -> dict:
        return {
            "probability": round(self.probability, 4),
            "confidence_band": [round(self.confidence_band[0], 4), round(self.confidence_band[1], 4)],
            "mode": self.mode,
            "triggered_rules": self.triggered_rules,
            "evidence": self.evidence,
            "feature_snapshot": self.feature_snapshot,
        }


class AnomalyService:
    """
    Multi-signal anomaly detection service.

    Current signals:
      1. Rule Engine (always active) — deterministic, auditable rules

    Future signals (Phase 3):
      2. Isolation Forest (ML) — activated after 50+ sessions + validation
      3. Statistical Baseline — z-scores vs CodeNet distribution

    The LLM is NEVER used for scoring. Only for generating explanations
    of scores already computed by signals 1-3.
    """

    def __init__(
        self,
        store: Optional[FeatureStore] = None,
        rules: Optional[AnomalyRuleEngine] = None,
    ):
        self.feature_store = store or feature_store
        self.rule_engine = rules or rule_engine

    async def analyze(
        self, session_id: int, events: list[CodingEvent]
    ) -> AnomalyResult:
        """
        Run full anomaly analysis pipeline.

        Steps:
          1. Extract behavioral features from event stream
          2. Evaluate rule engine
          3. (Phase 3) Evaluate ML model if available
          4. Combine signals into calibrated probability
          5. Return result with full audit context

        Args:
            session_id: The session being analyzed
            events: Ordered list of CodingEvent objects

        Returns:
            AnomalyResult with calibrated probability and evidence
        """
        # Step 1: Extract features
        features = await self.feature_store.get_or_compute(session_id, events)

        # Step 2: Rule engine (always active)
        rule_result = self.rule_engine.evaluate(features)

        # Step 3: ML model (Phase 3 — not yet implemented)
        ml_score: Optional[float] = None
        ml_score = await self._try_ml_model(features)

        # Step 4: Combine signals
        if ml_score is not None:
            # Ensemble: 40% rules + 60% ML (Phase 3)
            probability = 0.4 * rule_result.score + 0.6 * ml_score
            mode = "ml_ensemble"
        else:
            # Phase 1: Rules only
            probability = rule_result.score
            mode = "rule_based"

        # Confidence band: ±10% for rule-based, ±5% for ensemble
        margin = 0.10 if mode == "rule_based" else 0.05
        confidence_band = (
            max(0.0, probability - margin),
            min(1.0, probability + margin),
        )

        result = AnomalyResult(
            probability=probability,
            confidence_band=confidence_band,
            mode=mode,
            triggered_rules=[r.to_dict() for r in rule_result.triggered_rules],
            evidence=rule_result.evidence_strings,
            feature_snapshot=features.to_dict(),
        )

        # Step 5: Log to audit trail
        await self._log_prediction_audit(session_id, features, rule_result, result)

        return result

    async def _try_ml_model(self, features: BehavioralFeatures) -> Optional[float]:
        """
        Attempt to score with ML model if one is registered and in production.
        Returns None if no ML model is available (Phase 1 behavior).

        Phase 3 implementation will:
          1. Load model from registry
          2. Score features
          3. Also run shadow model if one exists
        """
        try:
            # Phase 3: Import and use model registry here
            # from app.ml.model_registry import model_registry
            # model = model_registry.get_production_model("anomaly_detector")
            # if model: return model.predict(features.to_vector())
            return None
        except Exception:
            return None

    async def _log_prediction_audit(
        self,
        session_id: int,
        features: BehavioralFeatures,
        rule_result: RuleEngineResult,
        final_result: AnomalyResult,
    ) -> None:
        """
        Write immutable audit record for this prediction.
        Fire-and-forget — audit failure must never block the pipeline.
        """
        try:
            from app.core.database import AsyncSessionLocal
            from app.models.prediction_audit import PredictionAudit

            async with AsyncSessionLocal() as db:
                audit = PredictionAudit(
                    session_id=session_id,
                    prediction_type="anomaly",
                    model_id=f"rule_engine_{features.feature_version}",
                    feature_version=features.feature_version,
                    feature_snapshot=features.to_dict(),
                    raw_output=rule_result.to_dict(),
                    final_score=final_result.probability,
                )
                db.add(audit)
                await db.commit()
        except Exception as e:
            # Audit failure must never crash the pipeline
            logger.warning(f"Failed to write prediction audit for session {session_id}: {e}")


# Module-level singleton
anomaly_service = AnomalyService()
