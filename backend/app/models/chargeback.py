"""Chargeback model - payment dispute records."""

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Chargeback(Base):
    __tablename__ = "chargebacks"

    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False)
    reason = Column(String(200), nullable=True)
    status = Column(String(50), default="OPEN")  # OPEN, WON, LOST, PENDING

    # Relationships
    transaction = relationship("Transaction", back_populates="chargebacks")
    customer = relationship("Customer", back_populates="chargebacks")

    def __repr__(self):
        return f"<Chargeback(id={self.id}, status={self.status}, reason={self.reason})>"
