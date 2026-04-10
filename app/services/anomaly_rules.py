"""
Anomaly Rule Engine — Deterministic, auditable behavioral anomaly detection.

Production design principles:
  1. Every rule has an ID for audit trail traceability.
  2. Every rule has a human-readable description and evidence generator.
  3. No ML, no randomness. Same features → same output every time.
  4. Outputs a calibrated probability (0.0 - 1.0), not a binary flag.
  5. The recruiter sets the threshold — the system does not make hiring decisions.
"""
from dataclasses import dataclass, asdict
from typing import Callable, Optional

from app.services.feature_store import BehavioralFeatures


@dataclass
class AnomalyRule:
    """Single auditable anomaly detection rule."""
    id: str                # Unique rule ID, e.g. "PASTE_001"
    description: str       # Human-readable explanation
    severity: str          # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    weight: float          # Contribution to overall probability (sum of all weights = 1.0)
    check: Callable[[BehavioralFeatures], bool]      # Returns True if rule triggered
    evidence: Callable[[BehavioralFeatures], str]     # Human-readable evidence string


@dataclass
class TriggeredRule:
    """Result of a triggered rule — stored in audit trail."""
    rule_id: str
    description: str
    severity: str
    evidence: str
    weight: float

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RuleEngineResult:
    """Output from the rule engine evaluation."""
    score: float                         # 0.0 - 1.0 calibrated probability
    triggered_rules: list[TriggeredRule]  # Which rules fired
    total_rules_checked: int
    evidence_strings: list[str]          # For display to recruiter

    def to_dict(self) -> dict:
        return {
            "score": round(self.score, 4),
            "triggered_rules": [r.to_dict() for r in self.triggered_rules],
            "total_rules_checked": self.total_rules_checked,
            "evidence_strings": self.evidence_strings,
        }


# ============================================================================
# RULE DEFINITIONS
# ============================================================================
# Weights sum to 1.0. Each rule contributes its weight to the final probability
# when triggered. If all rules fire, probability = 1.0.
#
# Threshold rationale: derived from intuition about coding behavior patterns.
# Will be refined with CodeNet baseline data in Phase 3.
# ============================================================================

ANOMALY_RULES: list[AnomalyRule] = [
    AnomalyRule(
        id="PASTE_001",
        description="Single code delta exceeds 300 characters — suggests bulk paste",
        severity="HIGH",
        weight=0.20,
        check=lambda f: f.max_code_delta_chars > 300,
        evidence=lambda f: (
            f"Code grew by {f.max_code_delta_chars} chars in a single event "
            f"(threshold: 300)"
        ),
    ),
    AnomalyRule(
        id="PASTE_002",
        description="Paste event ratio exceeds 30% of all events",
        severity="HIGH",
        weight=0.15,
        check=lambda f: f.paste_event_ratio > 0.3,
        evidence=lambda f: (
            f"Paste events: {f.paste_event_count}/{f.total_events} "
            f"({f.paste_event_ratio:.0%})"
        ),
    ),
    AnomalyRule(
        id="ENTROPY_001",
        description="Edit entropy below 1.5 bits — non-incremental development pattern",
        severity="MEDIUM",
        weight=0.15,
        check=lambda f: f.edit_entropy < 1.5 and f.total_events > 10,
        evidence=lambda f: (
            f"Edit distribution entropy: {f.edit_entropy:.2f} bits "
            f"(expected >2.5 for iterative coding)"
        ),
    ),
    AnomalyRule(
        id="GINI_001",
        description="Code growth Gini > 0.7 — most code arrived in bulk",
        severity="HIGH",
        weight=0.20,
        check=lambda f: f.code_delta_gini > 0.7,
        evidence=lambda f: (
            f"Code growth Gini coefficient: {f.code_delta_gini:.2f} "
            f"(1.0 = all code appeared in one event)"
        ),
    ),
    AnomalyRule(
        id="VELOCITY_001",
        description="More than 2 typing velocity bursts detected (>3σ from mean)",
        severity="MEDIUM",
        weight=0.10,
        check=lambda f: f.velocity_burst_count > 2,
        evidence=lambda f: (
            f"{f.velocity_burst_count} typing velocity anomalies detected "
            f"(>3σ from session mean)"
        ),
    ),
    AnomalyRule(
        id="IDLE_BURST_001",
        description="Idle-then-burst pattern: long silence followed by large code block",
        severity="CRITICAL",
        weight=0.15,
        check=lambda f: f.idle_burst_ratio > 0.3,
        evidence=lambda f: (
            f"Idle→burst ratio: {f.idle_burst_ratio:.2f} — {f.idle_burst_ratio:.0%} "
            f"of events follow a long idle period with large code insertion"
        ),
    ),
    AnomalyRule(
        id="JUMP_001",
        description="Multiple large code insertions (>200 chars each)",
        severity="MEDIUM",
        weight=0.05,
        check=lambda f: f.code_length_jumps >= 3,
        evidence=lambda f: (
            f"{f.code_length_jumps} code insertions exceeded 200 characters each"
        ),
    ),
]


class AnomalyRuleEngine:
    """
    Evaluates all rules against a feature vector.
    Returns a calibrated probability score and triggered rule details.
    """

    def __init__(self, rules: Optional[list[AnomalyRule]] = None):
        self.rules = rules or ANOMALY_RULES

    def evaluate(self, features: BehavioralFeatures) -> RuleEngineResult:
        """
        Run all rules against features.

        Returns:
            RuleEngineResult with probability = sum of triggered rule weights.
            If no rules fire, probability = 0.0.
            If all rules fire, probability = 1.0.
        """
        triggered: list[TriggeredRule] = []

        for rule in self.rules:
            try:
                if rule.check(features):
                    triggered.append(TriggeredRule(
                        rule_id=rule.id,
                        description=rule.description,
                        severity=rule.severity,
                        evidence=rule.evidence(features),
                        weight=rule.weight,
                    ))
            except Exception:
                # Rule evaluation should never crash the pipeline
                continue

        # Probability = sum of triggered rule weights (capped at 1.0)
        score = min(1.0, sum(r.weight for r in triggered))

        evidence_strings = [r.evidence for r in triggered]

        return RuleEngineResult(
            score=score,
            triggered_rules=triggered,
            total_rules_checked=len(self.rules),
            evidence_strings=evidence_strings,
        )


# Module-level singleton
rule_engine = AnomalyRuleEngine()
