"""Customer model - merchant's customer profiles."""

from sqlalchemy import Column, String, DateTime, Float, Integer
from sqlalchemy.orm import relationship
from backend.app.database import Base
from datetime import datetime, timezone


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    country = Column(String(10), nullable=False, default="US")
    lifetime_value = Column(Float, default=0.0)
    transaction_count = Column(Integer, default=0)
    average_transaction = Column(Float, default=0.0)
    return_count = Column(Integer, default=0)
    return_rate = Column(Float, default=0.0)
    chargeback_count = Column(Integer, default=0)
    chargeback_rate = Column(Float, default=0.0)

    # Relationships
    transactions = relationship("Transaction", back_populates="customer", lazy="dynamic")
    returns = relationship("Return", back_populates="customer", lazy="dynamic")
    chargebacks = relationship("Chargeback", back_populates="customer", lazy="dynamic")

    def __repr__(self):
        return f"<Customer(id={self.id}, country={self.country}, ltv={self.lifetime_value:.2f})>"
