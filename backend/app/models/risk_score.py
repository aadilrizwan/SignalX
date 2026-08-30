"""RiskScore model - stores the multi-engine risk assessment for each transaction."""

from sqlalchemy import Column, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from datetime import datetime, timezone


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False, index=True)
    ml_score = Column(Float, default=0.0)
    behavior_score = Column(Float, default=0.0)
    graph_score = Column(Float, default=0.0)
    anomaly_score = Column(Float, default=0.0)
    rule_score = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    decision = Column(String(20), default="ALLOW")   # ALLOW, REVIEW, BLOCK
    expected_loss = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    transaction = relationship("Transaction", back_populates="risk_scores")

    def __repr__(self):
        return f"<RiskScore(txn={self.transaction_id}, final={self.final_score:.2f}, decision={self.decision})>"
