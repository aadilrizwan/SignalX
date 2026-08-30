"""Review model - human analyst review decisions."""

from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base
from datetime import datetime, timezone


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False, index=True)
    reviewer = Column(String(100), nullable=False)
    decision = Column(String(50), nullable=False)  # CONFIRM_FRAUD, MARK_LEGITIMATE, NEEDS_EVIDENCE
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    transaction = relationship("Transaction", back_populates="reviews")

    def __repr__(self):
        return f"<Review(txn={self.transaction_id}, decision={self.decision})>"
