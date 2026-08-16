from models.transaction_model import Transaction
from models.budget_model import Budget
from sqlalchemy import extract

def get_monthly_analysis(user_id, month, year):
    txns = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year
    ).all()

    income = sum(float(t.amount) for t in txns if t.type == "Income")
    expenses = sum(float(t.amount) for t in txns if t.type == "Expense")

    budget = Budget.query.filter_by(user_id=user_id, month=month, year=year).first()
    limit = float(budget.limit_amount) if budget else None

    return {
        "month": month,
        "year": year,
        "total_income": income,
        "total_expenses": expenses,
        "savings": income - expenses,
        "budget_limit": limit,
        "budget_used": expenses,
        "within_budget": expenses <= limit if limit else None
    }
