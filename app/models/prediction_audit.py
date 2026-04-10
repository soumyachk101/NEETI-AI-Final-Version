"""
Prediction Audit model — Immutable audit trail for every ML/rule-based prediction.

Production requirements:
  - Written once. Never updated. Never deleted.
  - Every prediction traceable to exact model version + feature snapshot.
  - Supports compliance queries: "Why was session X flagged?"
"""
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    JSON,
    Index,
    text,
)
from sqlalchemy.sql import func

from app.core.database import Base


class PredictionAudit(Base):
    """
    Immutable audit record for every model prediction.

    One row per prediction. A session may have multiple predictions
    (e.g., anomaly + evaluation). Each is logged independently.
    """
    __tablename__ = "prediction_audits"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    session_id = Column(Integer, nullable=False, index=True)

    # What kind of prediction
    prediction_type = Column(String(50), nullable=False)  # "anomaly" | "evaluation"

    # Which model made it
    model_id = Column(String(100), nullable=False)        # "rule_engine_v1.0" | "isolation_forest_v1.2"

    # Which feature computation was used
    feature_version = Column(String(20), nullable=False)  # "v1.0"

    # Exact features at prediction time (for reproducibility)
    feature_snapshot = Column(JSON, nullable=False, default=dict)

    # Raw model output before any post-processing
    raw_output = Column(JSON, nullable=False, default=dict)

    # Final score shown to user
    final_score = Column(Float, nullable=False)

    # Immutable timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_audit_session_type", "session_id", "prediction_type"),
        Index("idx_audit_model", "model_id"),
        Index("idx_audit_created", "created_at"),
    )
