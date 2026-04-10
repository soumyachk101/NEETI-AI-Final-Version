"""
Feature Store — Centralized behavioral feature extraction and caching.

Production design principles:
  1. Features are computed ONCE and cached with a version tag.
  2. If FEATURE_VERSION changes, old cache is ignored → full recomputation.
  3. Training and inference read from the same store → no skew.
  4. Every feature is documented and strictly typed.
"""
import json
import math
import hashlib
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from typing import Optional

import numpy as np

from app.models.models import CodingEvent
from app.core.logging import logger

FEATURE_VERSION = "v1.0"


@dataclass
class BehavioralFeatures:
    """
    Strictly typed behavioral feature vector.
    Extracted from a session's CodingEvent stream.
    Every field is documented for audit trail clarity.
    """
    feature_version: str = FEATURE_VERSION
    session_id: int = 0

    # --- Paste detection ---
    paste_event_count: int = 0          # Events where event_type == "paste"
    paste_event_ratio: float = 0.0      # paste_events / total_events
    max_code_delta_chars: int = 0       # Largest single-event code_snapshot length jump

    # --- Keystroke dynamics ---
    mean_keystroke_gap_ms: float = 0.0  # Mean time between consecutive events (ms)
    p95_keystroke_gap_ms: float = 0.0   # 95th-percentile gap — long gaps then bursts = suspicious
    velocity_burst_count: int = 0       # Windows where typing speed > 3σ from session mean

    # --- Code growth distribution ---
    code_delta_gini: float = 0.0        # Gini coefficient: 0=uniform growth, 1=single paste
    edit_entropy: float = 0.0           # Shannon entropy of edit sizes: low = suspicious

    # --- Timing patterns ---
    time_to_first_execute_s: float = 0.0  # Session start → first execution (seconds)
    idle_burst_ratio: float = 0.0         # (long idle → burst of code) occurrences / total

    # --- Solution behavior ---
    solution_attempt_count: int = 0     # Distinct execution attempts
    code_length_jumps: int = 0          # Events where code grew >200 chars at once

    # --- Metadata ---
    total_events: int = 0
    session_duration_s: float = 0.0

    def to_dict(self) -> dict:
        """Serialize for JSON storage / audit trail."""
        return asdict(self)

    def to_vector(self) -> list[float]:
        """
        Return numeric features as a flat vector for ML models.
        Order matters — must match training feature order.
        """
        return [
            self.paste_event_ratio,
            float(self.max_code_delta_chars),
            self.mean_keystroke_gap_ms,
            self.p95_keystroke_gap_ms,
            float(self.velocity_burst_count),
            self.code_delta_gini,
            self.edit_entropy,
            self.time_to_first_execute_s,
            self.idle_burst_ratio,
            float(self.solution_attempt_count),
            float(self.code_length_jumps),
        ]


def _compute_gini(values: list[float]) -> float:
    """
    Compute Gini coefficient of a distribution.
    0 = perfectly equal (uniform code growth), 1 = maximally unequal (one big paste).
    """
    if not values or all(v == 0 for v in values):
        return 0.0
    arr = np.array(sorted(values), dtype=float)
    n = len(arr)
    cumsum = np.cumsum(arr)
    return float((2.0 * np.sum((np.arange(1, n + 1) * arr))) / (n * cumsum[-1]) - (n + 1) / n)


def _compute_shannon_entropy(values: list[float]) -> float:
    """
    Shannon entropy of a distribution of edit sizes.
    High entropy = diverse edit sizes (human). Low entropy = uniform/single-size (paste).
    """
    if not values or all(v == 0 for v in values):
        return 0.0
    total = sum(values)
    if total == 0:
        return 0.0
    probs = [v / total for v in values if v > 0]
    return float(-sum(p * math.log2(p) for p in probs))


class FeatureStore:
    """
    Computes, caches, and serves behavioral features.

    Cache key: features:{session_id}:{FEATURE_VERSION}
    Cache TTL: 24 hours (features are deterministic — same events → same features).
    """

    def __init__(self):
        self._redis = None

    async def _get_redis(self):
        """Lazy Redis connection."""
        if self._redis is None:
            try:
                from app.core.redis import get_redis
                self._redis = await get_redis()
            except Exception:
                self._redis = None
        return self._redis

    async def get_or_compute(
        self, session_id: int, events: list[CodingEvent]
    ) -> BehavioralFeatures:
        """
        Public interface. Returns versioned features.
        Checks cache first; computes and caches if miss.
        """
        cache_key = f"features:{session_id}:{FEATURE_VERSION}"

        # Try cache
        redis = await self._get_redis()
        if redis:
            try:
                cached = await redis.get(cache_key)
                if cached:
                    data = json.loads(cached)
                    return BehavioralFeatures(**data)
            except Exception as e:
                logger.warning(f"Feature cache read failed: {e}")

        # Compute
        features = self.compute(session_id, events)

        # Cache (fire and forget)
        if redis:
            try:
                await redis.set(
                    cache_key,
                    json.dumps(features.to_dict()),
                    ex=86400  # 24h TTL
                )
            except Exception as e:
                logger.warning(f"Feature cache write failed: {e}")

        return features

    def compute(self, session_id: int, events: list[CodingEvent]) -> BehavioralFeatures:
        """
        Compute all behavioral features from raw CodingEvent list.
        This is a pure function: same events → same features. No side effects.
        """
        if not events:
            return BehavioralFeatures(session_id=session_id, feature_version=FEATURE_VERSION)

        total_events = len(events)

        # --- Sort by timestamp ---
        sorted_events = sorted(events, key=lambda e: e.timestamp or datetime.min.replace(tzinfo=timezone.utc))

        # --- Session duration ---
        first_ts = sorted_events[0].timestamp
        last_ts = sorted_events[-1].timestamp
        session_duration_s = 0.0
        if first_ts and last_ts:
            session_duration_s = max(0.0, (last_ts - first_ts).total_seconds())

        # --- Paste detection ---
        paste_events = [e for e in sorted_events if e.event_type == "paste"]
        paste_event_count = len(paste_events)
        paste_event_ratio = paste_event_count / total_events if total_events > 0 else 0.0

        # --- Code deltas (consecutive diffs of code_snapshot length) ---
        code_deltas = []
        prev_len = 0
        for event in sorted_events:
            if event.code_snapshot is not None:
                cur_len = len(event.code_snapshot)
                delta = abs(cur_len - prev_len)
                code_deltas.append(delta)
                prev_len = cur_len

        max_code_delta_chars = max(code_deltas) if code_deltas else 0
        code_length_jumps = sum(1 for d in code_deltas if d > 200)

        # --- Code growth distribution ---
        code_delta_gini = _compute_gini(code_deltas) if code_deltas else 0.0
        edit_entropy = _compute_shannon_entropy(code_deltas) if code_deltas else 0.0

        # --- Keystroke dynamics (time gaps between events) ---
        time_gaps_ms = []
        for i in range(1, len(sorted_events)):
            ts_prev = sorted_events[i - 1].timestamp
            ts_curr = sorted_events[i].timestamp
            if ts_prev and ts_curr:
                gap_ms = (ts_curr - ts_prev).total_seconds() * 1000
                time_gaps_ms.append(max(0.0, gap_ms))

        mean_keystroke_gap_ms = float(np.mean(time_gaps_ms)) if time_gaps_ms else 0.0
        p95_keystroke_gap_ms = float(np.percentile(time_gaps_ms, 95)) if time_gaps_ms else 0.0

        # --- Velocity burst detection ---
        velocity_burst_count = 0
        if time_gaps_ms and len(time_gaps_ms) >= 5:
            gap_mean = np.mean(time_gaps_ms)
            gap_std = np.std(time_gaps_ms)
            if gap_std > 0:
                # A burst = very short gap (much faster than average)
                burst_threshold = max(50.0, gap_mean - 3 * gap_std)
                velocity_burst_count = sum(1 for g in time_gaps_ms if g < burst_threshold)

        # --- Time to first execute ---
        time_to_first_execute_s = 0.0
        execute_events = [e for e in sorted_events if e.event_type == "execute"]
        if execute_events and first_ts and execute_events[0].timestamp:
            time_to_first_execute_s = max(
                0.0, (execute_events[0].timestamp - first_ts).total_seconds()
            )

        solution_attempt_count = len(execute_events)

        # --- Idle-burst pattern detection ---
        # An "idle burst" = gap > 60s followed by code delta > 150 chars within next 2 events
        idle_burst_count = 0
        for i in range(len(sorted_events) - 1):
            ts_curr = sorted_events[i].timestamp
            ts_next = sorted_events[i + 1].timestamp
            if ts_curr and ts_next:
                gap_s = (ts_next - ts_curr).total_seconds()
                if gap_s > 60:
                    # Check if next event(s) have large code deltas
                    for j in range(i + 1, min(i + 3, len(sorted_events))):
                        snap = sorted_events[j].code_snapshot
                        prev_snap = sorted_events[j - 1].code_snapshot if j > 0 else None
                        if snap and prev_snap:
                            if abs(len(snap) - len(prev_snap)) > 150:
                                idle_burst_count += 1
                                break

        idle_burst_ratio = idle_burst_count / total_events if total_events > 0 else 0.0

        return BehavioralFeatures(
            feature_version=FEATURE_VERSION,
            session_id=session_id,
            paste_event_count=paste_event_count,
            paste_event_ratio=round(paste_event_ratio, 4),
            max_code_delta_chars=max_code_delta_chars,
            mean_keystroke_gap_ms=round(mean_keystroke_gap_ms, 2),
            p95_keystroke_gap_ms=round(p95_keystroke_gap_ms, 2),
            velocity_burst_count=velocity_burst_count,
            code_delta_gini=round(code_delta_gini, 4),
            edit_entropy=round(edit_entropy, 4),
            time_to_first_execute_s=round(time_to_first_execute_s, 2),
            idle_burst_ratio=round(idle_burst_ratio, 4),
            solution_attempt_count=solution_attempt_count,
            code_length_jumps=code_length_jumps,
            total_events=total_events,
            session_duration_s=round(session_duration_s, 2),
        )


# Module-level singleton
feature_store = FeatureStore()
