"""Transaction model - individual payment transactions."""

from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base
from datetime import datetime, timezone


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    merchant_id = Column(String, nullable=False, default="merchant_001")
    timestamp = Column(DateTime, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    payment_method = Column(String(50), nullable=False)
    device_id = Column(String, ForeignKey("devices.id"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 max length
    billing_country = Column(String(10), nullable=True)
    shipping_country = Column(String(10), nullable=True)
    product_id = Column(String, nullable=True)
    is_fraud = Column(Boolean, default=False, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="transactions")
    device = relationship("Device", back_populates="transactions")
    risk_scores = relationship("RiskScore", back_populates="transaction", lazy="dynamic")
    returns = relationship("Return", back_populates="transaction", lazy="dynamic")
    chargebacks = relationship("Chargeback", back_populates="transaction", lazy="dynamic")
    reviews = relationship("Review", back_populates="transaction", lazy="dynamic")
    evidence_items = relationship("Evidence", back_populates="transaction", lazy="dynamic")

    # Composite indexes for common queries
    __table_args__ = (
        Index("ix_transactions_customer_timestamp", "customer_id", "timestamp"),
        Index("ix_transactions_device_timestamp", "device_id", "timestamp"),
        Index("ix_transactions_ip_timestamp", "ip_address", "timestamp"),
    )

    def __repr__(self):
        return f"<Transaction(id={self.id}, amount={self.amount:.2f}, fraud={self.is_fraud})>"
