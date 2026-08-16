from db.db_connection import db
from models.transaction_model import Transaction
from models.user_model import User
from sqlalchemy import extract

def add_transaction(user_id, type, category, title, amount, date, notes=None):
    user = User.query.get(user_id)
    if not user:
        return None, "User not found"
    txn = Transaction(
        user_id=user_id, type=type, category=category,
        title=title, amount=amount, date=date, notes=notes
    )
    db.session.add(txn)
    if type == "Income":
        user.current_balance += amount
    else:
        user.current_balance -= amount
    db.session.commit()
    return txn, None

def get_transactions(user_id, month=None, year=None):
    query = Transaction.query.filter_by(user_id=user_id)
    if month and year:
        query = query.filter(
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year
        )
    return query.order_by(Transaction.date.desc()).all()

def update_transaction(transaction_id, data):
    txn = Transaction.query.get(transaction_id)
    if not txn:
        return None, "Transaction not found"
    user = User.query.get(txn.user_id)

    # reverse old effect on balance
    if txn.type == "Income":
        user.current_balance -= txn.amount
    else:
        user.current_balance += txn.amount

    # apply updates
    txn.type = data.get("type", txn.type)
    txn.category = data.get("category", txn.category)
    txn.title = data.get("title", txn.title)
    txn.amount = data.get("amount", txn.amount)
    txn.date = data.get("date", txn.date)
    txn.notes = data.get("notes", txn.notes)

    # apply new effect on balance
    if txn.type == "Income":
        user.current_balance += txn.amount
    else:
        user.current_balance -= txn.amount

    db.session.commit()
    return txn, None

def delete_transaction(transaction_id):
    txn = Transaction.query.get(transaction_id)
    if not txn:
        return "Transaction not found"
    user = User.query.get(txn.user_id)

    # reverse effect on balance
    if txn.type == "Income":
        user.current_balance -= txn.amount
    else:
        user.current_balance += txn.amount

    db.session.delete(txn)
    db.session.commit()
    return None

def get_category_summary(user_id, month, year):
    txns = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year
    ).all()

    summary = {}
    for t in txns:
        key = f"{t.type}:{t.category}"
        summary[key] = summary.get(key, 0) + float(t.amount)

    result = {"income": {}, "expense": {}}
    for key, total in summary.items():
        type_, cat = key.split(":", 1)
        if type_ == "Income":
            result["income"][cat] = total
        else:
            result["expense"][cat] = total
    return result
