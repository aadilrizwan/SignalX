"""Evidence model - source-backed evidence items for chargeback defense."""

from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base
from datetime import datetime, timezone


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)  # ORDER, PAYMENT, DELIVERY, COMMUNICATION, etc.
    source_id = Column(String, nullable=True)
    claim = Column(Text, nullable=False)
    content = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    transaction = relationship("Transaction", back_populates="evidence_items")

    def __repr__(self):
        return f"<Evidence(txn={self.transaction_id}, source={self.source_type}, conf={self.confidence:.2f})>"
