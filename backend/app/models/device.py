"""Device model - device fingerprints used in transactions."""

from sqlalchemy import Column, String, DateTime, Integer, Float
from sqlalchemy.orm import relationship
from backend.app.database import Base
from datetime import datetime, timezone


class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, index=True)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    customer_count = Column(Integer, default=0)
    transaction_count = Column(Integer, default=0)
    fraud_count = Column(Integer, default=0)

    # Relationships
    transactions = relationship("Transaction", back_populates="device", lazy="dynamic")

    @property
    def fraud_rate(self) -> float:
        if self.transaction_count == 0:
            return 0.0
        return self.fraud_count / self.transaction_count

    def __repr__(self):
        return f"<Device(id={self.id}, customers={self.customer_count}, fraud_rate={self.fraud_rate:.2%})>"
