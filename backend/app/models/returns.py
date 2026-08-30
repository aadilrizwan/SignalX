"""Return model - product returns and refunds."""

from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Return(Base):
    __tablename__ = "returns"

    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False)
    reason = Column(String(200), nullable=True)
    refund_amount = Column(Float, nullable=False)
    days_after_purchase = Column(Integer, nullable=False)

    # Relationships
    transaction = relationship("Transaction", back_populates="returns")
    customer = relationship("Customer", back_populates="returns")

    def __repr__(self):
        return f"<Return(id={self.id}, refund={self.refund_amount:.2f}, days={self.days_after_purchase})>"
