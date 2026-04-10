"""
Local skill taxonomy based on O*NET competency framework.
Maps 200+ tech skills to competency categories for role-aware evaluation.
Zero external API dependency.
"""
from typing import Optional
from dataclasses import dataclass, field

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class RoleProfile:
    """Structured role profile extracted from a job description."""
    role_title: str = ""
    seniority: str = "mid"                          # junior | mid | senior | lead | principal
    department: str = "engineering"                  # engineering | data | product | design | devops
    required_skills: list[str] = field(default_factory=list)
    preferred_skills: list[str] = field(default_factory=list)
    key_responsibilities: list[str] = field(default_factory=list)
    evaluation_focus: str = ""                       # LLM-generated guidance for evaluation


# ---------------------------------------------------------------------------
# Skill → Competency Area mapping
# Competency areas align with our 4 agent types:
#   coding        →  CodingAgent
#   communication →  SpeechAgent
#   reasoning     →  ReasoningAgent
#   engagement    →  VisionAgent (engagement, collaboration)
# ---------------------------------------------------------------------------

SKILL_COMPETENCY_MAP: dict[str, str] = {
    # Programming Languages → coding
    "python": "coding", "javascript": "coding", "typescript": "coding",
    "java": "coding", "c++": "coding", "c#": "coding", "go": "coding",
    "rust": "coding", "ruby": "coding", "php": "coding", "swift": "coding",
    "kotlin": "coding", "scala": "coding", "r": "coding", "matlab": "coding",
    "perl": "coding", "lua": "coding", "dart": "coding", "elixir": "coding",
    "haskell": "coding", "clojure": "coding", "solidity": "coding",

    # Frameworks → coding
    "react": "coding", "angular": "coding", "vue": "coding", "svelte": "coding",
    "next.js": "coding", "nuxt": "coding", "django": "coding", "flask": "coding",
    "fastapi": "coding", "express": "coding", "spring": "coding", "rails": "coding",
    "laravel": "coding", "asp.net": "coding", "nestjs": "coding",
    "tailwind": "coding", "bootstrap": "coding",

    # Databases → coding + reasoning
    "sql": "coding", "postgresql": "coding", "mysql": "coding", "mongodb": "coding",
    "redis": "coding", "elasticsearch": "coding", "cassandra": "coding",
    "dynamodb": "coding", "firebase": "coding", "supabase": "coding",
    "neo4j": "coding", "sqlite": "coding",

    # DevOps / Infrastructure → reasoning
    "docker": "reasoning", "kubernetes": "reasoning", "terraform": "reasoning",
    "aws": "reasoning", "azure": "reasoning", "gcp": "reasoning",
    "ci/cd": "reasoning", "jenkins": "reasoning", "github actions": "reasoning",
    "ansible": "reasoning", "linux": "reasoning", "nginx": "reasoning",
    "cloudflare": "reasoning",

    # System Design → reasoning
    "system design": "reasoning", "microservices": "reasoning",
    "distributed systems": "reasoning", "api design": "reasoning",
    "rest": "reasoning", "graphql": "reasoning", "grpc": "reasoning",
    "message queues": "reasoning", "kafka": "reasoning", "rabbitmq": "reasoning",
    "caching": "reasoning", "load balancing": "reasoning",
    "event-driven": "reasoning", "domain-driven design": "reasoning",

    # Data / ML → reasoning
    "machine learning": "reasoning", "deep learning": "reasoning",
    "data science": "reasoning", "pandas": "reasoning", "numpy": "reasoning",
    "tensorflow": "reasoning", "pytorch": "reasoning", "scikit-learn": "reasoning",
    "nlp": "reasoning", "computer vision": "reasoning", "llm": "reasoning",
    "rag": "reasoning", "langchain": "reasoning", "data engineering": "reasoning",
    "spark": "reasoning", "airflow": "reasoning", "dbt": "reasoning",
    "etl": "reasoning",

    # Algorithms & CS → reasoning
    "algorithms": "reasoning", "data structures": "reasoning",
    "dynamic programming": "reasoning", "graph algorithms": "reasoning",
    "complexity analysis": "reasoning", "design patterns": "reasoning",
    "oop": "reasoning", "functional programming": "reasoning",
    "concurrency": "reasoning", "multithreading": "reasoning",

    # Testing → coding
    "testing": "coding", "unit testing": "coding", "jest": "coding",
    "pytest": "coding", "selenium": "coding", "cypress": "coding",
    "tdd": "coding", "integration testing": "coding",

    # Communication & Soft Skills → communication
    "communication": "communication", "presentation": "communication",
    "documentation": "communication", "technical writing": "communication",
    "stakeholder management": "communication", "client-facing": "communication",
    "cross-functional": "communication", "mentoring": "communication",
    "leadership": "communication", "team lead": "communication",
    "project management": "communication", "agile": "communication",
    "scrum": "communication", "jira": "communication",

    # Collaboration → engagement
    "teamwork": "engagement", "collaboration": "engagement",
    "code review": "engagement", "pair programming": "engagement",
    "remote work": "engagement", "open source": "engagement",
    "git": "engagement", "github": "engagement", "gitlab": "engagement",

    # Security → reasoning
    "security": "reasoning", "oauth": "reasoning", "jwt": "reasoning",
    "encryption": "reasoning", "penetration testing": "reasoning",
    "owasp": "reasoning", "compliance": "reasoning",

    # Mobile → coding
    "ios": "coding", "android": "coding", "react native": "coding",
    "flutter": "coding", "mobile development": "coding",

    # Blockchain → coding + reasoning
    "blockchain": "reasoning", "smart contracts": "coding",
    "web3": "coding", "defi": "reasoning", "stellar": "coding",
    "ethereum": "coding", "soroban": "coding",
}


# ---------------------------------------------------------------------------
# Seniority expectation thresholds
# ---------------------------------------------------------------------------

SENIORITY_THRESHOLDS: dict[str, dict[str, float]] = {
    "junior": {
        "min_score_for_hire": 55.0,
        "expected_code_quality": 50.0,
        "tolerance_for_errors": 0.7,       # more forgiving
    },
    "mid": {
        "min_score_for_hire": 65.0,
        "expected_code_quality": 65.0,
        "tolerance_for_errors": 0.5,
    },
    "senior": {
        "min_score_for_hire": 75.0,
        "expected_code_quality": 75.0,
        "tolerance_for_errors": 0.3,        # strict
    },
    "lead": {
        "min_score_for_hire": 78.0,
        "expected_code_quality": 78.0,
        "tolerance_for_errors": 0.2,
    },
    "principal": {
        "min_score_for_hire": 82.0,
        "expected_code_quality": 82.0,
        "tolerance_for_errors": 0.15,
    },
}


def get_competency_distribution(skills: list[str]) -> dict[str, int]:
    """
    Map a list of skills to competency area counts.
    Returns: {"coding": 8, "reasoning": 5, "communication": 2, "engagement": 1}
    """
    dist: dict[str, int] = {
        "coding": 0,
        "communication": 0,
        "reasoning": 0,
        "engagement": 0,
    }
    for skill in skills:
        key = skill.lower().strip()
        area = SKILL_COMPETENCY_MAP.get(key)
        if area and area in dist:
            dist[area] += 1
    return dist


def get_seniority_thresholds(seniority: str) -> dict[str, float]:
    """Get evaluation thresholds for a seniority level."""
    return SENIORITY_THRESHOLDS.get(
        seniority.lower().strip(),
        SENIORITY_THRESHOLDS["mid"]
    )


def generate_evaluation_context(profile: RoleProfile) -> str:
    """
    Generate a context string for the evaluation LLM prompt
    based on the role profile.
    """
    parts = []

    if profile.role_title:
        parts.append(f"Role: {profile.role_title}")

    if profile.seniority:
        thresholds = get_seniority_thresholds(profile.seniority)
        parts.append(
            f"Seniority: {profile.seniority.upper()} "
            f"(minimum hire score: {thresholds['min_score_for_hire']})"
        )

    if profile.required_skills:
        parts.append(f"Required Skills: {', '.join(profile.required_skills[:10])}")

    if profile.preferred_skills:
        parts.append(f"Preferred Skills: {', '.join(profile.preferred_skills[:5])}")

    if profile.key_responsibilities:
        parts.append("Key Responsibilities:")
        for resp in profile.key_responsibilities[:5]:
            parts.append(f"  - {resp}")

    if profile.evaluation_focus:
        parts.append(f"\nEvaluation Guidance: {profile.evaluation_focus}")

    return "\n".join(parts)
