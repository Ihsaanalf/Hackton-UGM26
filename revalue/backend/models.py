from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    price_per_kg = Column(Float, nullable=False)
    min_weight_kg = Column(Float, default=1.0)
    is_exchangeable = Column(Boolean, default=True)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    material_name = Column(String, nullable=False)

    estimated_weight_kg = Column(Float, nullable=False)
    actual_weight_kg = Column(Float, nullable=True)

    price_per_kg = Column(Float, nullable=False)

    gross_value = Column(Float, nullable=False)
    pickup_fee = Column(Float, nullable=False)
    net_value = Column(Float, nullable=False)

    status = Column(String, default="pending")

class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    id = Column(Integer, primary_key=True, index=True)

    transaction_id = Column(Integer, nullable=False)

    address = Column(String, nullable=False)

    status = Column(String, default="requested")

    collector_name = Column(String, nullable=True)

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    balance = Column(Float, default=0.0, nullable=False)


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)

    wallet_id = Column(Integer, nullable=False)
    transaction_id = Column(
        Integer,
        unique=True,
        nullable=False
    )

    amount = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)
    description = Column(String, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
