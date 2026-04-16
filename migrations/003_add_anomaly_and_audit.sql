-- Migration 003: Add anomaly detection fields and prediction audit trail
-- Phase 1 of the AI stack upgrade
-- Applied: Adds behavioral anomaly columns to evaluations + immutable audit table

BEGIN;

-- ============================================================================
-- 1. Add anomaly columns to evaluations table
-- ============================================================================
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS anomaly_probability FLOAT;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS anomaly_mode VARCHAR(50);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS anomaly_reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS behavioral_features JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- 2. Create prediction audit trail (immutable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prediction_audits (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    feature_version VARCHAR(20) NOT NULL,
    feature_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_output JSONB NOT NULL DEFAULT '{}'::jsonb,
    final_score FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common audit queries
CREATE INDEX IF NOT EXISTS idx_audit_session_type ON prediction_audits(session_id, prediction_type);
CREATE INDEX IF NOT EXISTS idx_audit_model ON prediction_audits(model_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON prediction_audits(created_at);

COMMIT;
