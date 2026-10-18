from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import Integer, String, Numeric, DateTime, Date, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Plan(Base):
    __tablename__ = "plans"

    plan_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category_type: Mapped[str] = mapped_column(String(50), default="Trip", nullable=False)
    target_budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Planning", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="plans")
    items: Mapped[List["PlanItem"]] = relationship(
        "PlanItem",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanItem.item_id",
    )


class PlanItem(Base):
    __tablename__ = "plan_items"

    item_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plans.plan_id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="General", nullable=False)
    estimated_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    actual_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paid_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    plan: Mapped["Plan"] = relationship("Plan", back_populates="items")

