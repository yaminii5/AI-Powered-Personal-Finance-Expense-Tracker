from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.budget import Budget
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetUpdate


def set_budget(
    db: Session, b_in: BudgetCreate
) -> tuple[Optional[Budget], Optional[str], int]:
    user = db.get(User, b_in.user_id)
    if not user:
        return None, "User not found", 404

    stmt = select(Budget).where(
        Budget.user_id == b_in.user_id,
        Budget.month == b_in.month,
        Budget.year == b_in.year,
    )
    existing = db.scalars(stmt).first()
    if existing:
        return None, "Budget already exists for this month/year. Use PUT to update.", 409

    budget = Budget(
        user_id=b_in.user_id,
        month=b_in.month,
        year=b_in.year,
        limit_amount=Decimal(str(b_in.limit_amount)),
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget, None, 201


def get_budgets_by_user(db: Session, user_id: int) -> List[Budget]:
    stmt = (
        select(Budget)
        .where(Budget.user_id == user_id)
        .order_by(Budget.year.desc(), Budget.month.desc())
    )
    return list(db.scalars(stmt).all())


def update_budget(
    db: Session, budget_id: int, b_in: BudgetUpdate
) -> tuple[Optional[Budget], Optional[str]]:
    budget = db.get(Budget, budget_id)
    if not budget:
        return None, "Budget not found"
    budget.limit_amount = Decimal(str(b_in.limit_amount))
    db.commit()
    db.refresh(budget)
    return budget, None


def delete_budget(db: Session, budget_id: int) -> Optional[str]:
    budget = db.get(Budget, budget_id)
    if not budget:
        return "Budget not found"
    db.delete(budget)
    db.commit()
    return None

