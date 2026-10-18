from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, extract

from app.models.transaction import Transaction
from app.models.budget import Budget


def get_monthly_analysis(
    db: Session, user_id: int, month: int, year: int
) -> Dict[str, Any]:
    stmt = select(Transaction).where(
        Transaction.user_id == user_id,
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year,
    )
    txns = db.scalars(stmt).all()

    income = sum(float(t.amount) for t in txns if t.type == "Income")
    expenses = sum(float(t.amount) for t in txns if t.type == "Expense")

    budget_stmt = select(Budget).where(
        Budget.user_id == user_id,
        Budget.month == month,
        Budget.year == year,
    )
    budget = db.scalars(budget_stmt).first()
    limit = float(budget.limit_amount) if budget else None

    return {
        "month": month,
        "year": year,
        "total_income": round(income, 2),
        "total_expenses": round(expenses, 2),
        "savings": round(income - expenses, 2),
        "budget_limit": limit,
        "budget_used": round(expenses, 2),
        "within_budget": (expenses <= limit) if limit is not None else None,
    }

