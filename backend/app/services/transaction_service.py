from decimal import Decimal
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import select, extract

from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionUpdate


def add_transaction(
    db: Session, txn_in: TransactionCreate
) -> tuple[Optional[Transaction], Optional[str]]:
    user = db.get(User, txn_in.user_id)
    if not user:
        return None, "User not found"

    amount_dec = Decimal(str(txn_in.amount))
    txn = Transaction(
        user_id=txn_in.user_id,
        type=txn_in.type,
        category=txn_in.category.strip(),
        title=txn_in.title.strip(),
        amount=amount_dec,
        date=txn_in.date,
        notes=txn_in.notes.strip() if txn_in.notes else None,
    )
    db.add(txn)

    if txn.type == "Income":
        user.current_balance += amount_dec
    else:
        user.current_balance -= amount_dec

    db.commit()
    db.refresh(txn)
    return txn, None


def get_transactions(
    db: Session,
    user_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> List[Transaction]:
    stmt = select(Transaction).where(Transaction.user_id == user_id)
    if month is not None and year is not None:
        stmt = stmt.where(
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
    stmt = stmt.order_by(Transaction.date.desc(), Transaction.transaction_id.desc())
    return list(db.scalars(stmt).all())


def update_transaction(
    db: Session,
    transaction_id: int,
    txn_in: TransactionUpdate,
) -> tuple[Optional[Transaction], Optional[str]]:
    txn = db.get(Transaction, transaction_id)
    if not txn:
        return None, "Transaction not found"

    user = db.get(User, txn.user_id)
    if not user:
        return None, "User not found"

    # Revert old balance effect
    if txn.type == "Income":
        user.current_balance -= txn.amount
    else:
        user.current_balance += txn.amount

    # Apply updates
    if txn_in.type is not None:
        txn.type = txn_in.type
    if txn_in.category is not None:
        txn.category = txn_in.category.strip()
    if txn_in.title is not None:
        txn.title = txn_in.title.strip()
    if txn_in.amount is not None:
        txn.amount = Decimal(str(txn_in.amount))
    if txn_in.date is not None:
        txn.date = txn_in.date
    if txn_in.notes is not None:
        txn.notes = txn_in.notes.strip() if txn_in.notes else None

    # Apply new balance effect
    if txn.type == "Income":
        user.current_balance += txn.amount
    else:
        user.current_balance -= txn.amount

    db.commit()
    db.refresh(txn)
    return txn, None


def delete_transaction(db: Session, transaction_id: int) -> Optional[str]:
    txn = db.get(Transaction, transaction_id)
    if not txn:
        return "Transaction not found"

    user = db.get(User, txn.user_id)
    if user:
        if txn.type == "Income":
            user.current_balance -= txn.amount
        else:
            user.current_balance += txn.amount

    db.delete(txn)
    db.commit()
    return None


def get_category_summary(
    db: Session, user_id: int, month: int, year: int
) -> Dict[str, Dict[str, float]]:
    stmt = select(Transaction).where(
        Transaction.user_id == user_id,
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year,
    )
    txns = db.scalars(stmt).all()

    income_dict: Dict[str, float] = {}
    expense_dict: Dict[str, float] = {}

    for t in txns:
        amount_val = float(t.amount)
        if t.type == "Income":
            income_dict[t.category] = income_dict.get(t.category, 0.0) + amount_val
        else:
            expense_dict[t.category] = expense_dict.get(t.category, 0.0) + amount_val

    return {"income": income_dict, "expense": expense_dict}

