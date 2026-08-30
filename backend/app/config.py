"""
SignalX - Application Configuration

All settings are loaded from environment variables with sensible defaults
for local development. In production, set these via your deployment platform.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = Field(
        default="sqlite:///./data/SignalX.db",
        description="Database connection string. SQLite for local dev, PostgreSQL for production."
    )

    # Supabase Cloud
    supabase_url: Optional[str] = Field(default=None, description="Supabase project URL (e.g. https://xxx.supabase.co)")
    supabase_publishable_key: Optional[str] = Field(default=None, description="Supabase publishable key.")
    supabase_anon_key: Optional[str] = Field(default=None, description="Supabase public anon key.")
    supabase_service_role_key: Optional[str] = Field(default=None, description="Supabase service role secret key.")
    supabase_storage_bucket: str = Field(default="evidence-dossiers", description="Supabase storage bucket for dispute dossiers.")

    # Redis
    redis_url: Optional[str] = Field(default=None, description="Redis URL for velocity features cache.")

    # Neo4j
    neo4j_uri: Optional[str] = Field(default=None, description="Neo4j connection URI.")
    neo4j_user: Optional[str] = Field(default=None)
    neo4j_username: Optional[str] = Field(default=None)
    neo4j_password: Optional[str] = Field(default=None)
    neo4j_database: Optional[str] = Field(default=None)

    # LLM / DeepSeek / Gemini
    llm_api_key: Optional[str] = Field(default=None, description="API key for LLM provider.")
    deepseek_api_key: Optional[str] = Field(default=None, description="DeepSeek API key for dispute rebuttal synthesis.")
    gemini_api_key: Optional[str] = Field(default=None, description="Google Gemini API key for evidence generation.")
    llm_provider: str = Field(default="deepseek", description="LLM provider: deepseek, openai, gemini, mock")

    # ML Model Paths
    ml_model_path: str = Field(default="ml/models/lightgbm_fraud.pkl")
    anomaly_model_path: str = Field(default="ml/models/isolation_forest.pkl")
    feature_columns_path: str = Field(default="ml/models/feature_columns.json")
    threshold_data_path: str = Field(default="ml/models/threshold_data.json")
    model_metrics_path: str = Field(default="ml/models/model_metrics.json")

    # Risk Thresholds
    risk_threshold_block: float = Field(default=0.7, ge=0.0, le=1.0)
    risk_threshold_review: float = Field(default=0.3, ge=0.0, le=1.0)

    # Cost Matrix (USD)
    fp_cost: float = Field(default=25.0, description="Cost of blocking a legitimate transaction.")
    fn_cost_multiplier: float = Field(default=1.0, description="Multiplier on transaction amount for fraud loss.")
    review_cost: float = Field(default=5.0, description="Cost of manual review per transaction.")

    # Risk Fusion Weights
    weight_ml: float = Field(default=0.40)
    weight_rules: float = Field(default=0.20)
    weight_anomaly: float = Field(default=0.15)
    weight_behavior: float = Field(default=0.15)
    weight_graph: float = Field(default=0.10)

    # API
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:8000")

    # Security
    api_key: str = Field(default="dev-api-key-change-in-production")
    secret_key: str = Field(default="change-this-to-a-random-secret-key")

    # Data paths
    data_dir: str = Field(default="data")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("database_url", mode="before")
    @classmethod
    def sanitize_database_url(cls, v):
        if not v or not isinstance(v, str) or not v.strip():
            return "sqlite:///./data/SignalX.db"
        v_clean = v.strip()
        # Convert deprecated postgres:// to postgresql+psycopg2:// or postgresql://
        if v_clean.startswith("postgres://"):
            v_clean = v_clean.replace("postgres://", "postgresql+psycopg2://", 1)
        elif v_clean.startswith("postgresql://") and not v_clean.startswith("postgresql+"):
            v_clean = v_clean.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v_clean

    @field_validator(
        "supabase_url", "supabase_publishable_key", "supabase_anon_key",
        "supabase_service_role_key", "redis_url", "neo4j_uri", "neo4j_user",
        "neo4j_username", "neo4j_password", "neo4j_database", "llm_api_key",
        "deepseek_api_key", "gemini_api_key", mode="before"
    )
    @classmethod
    def sanitize_optional_strings(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        for default_origin in ["http://localhost:3000", "http://localhost:8000"]:
            if default_origin not in origins:
                origins.append(default_origin)
        return origins


# Singleton settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get or create the settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings

