from flask import Blueprint, request, jsonify
from services.transaction_service import (
    add_transaction, get_transactions,
    update_transaction, delete_transaction,
    get_category_summary
)

txn_bp = Blueprint("transactions", __name__)

VALID_TYPES = {"Income", "Expense"}

@txn_bp.post("/transactions")
def create():
    d = request.json
    if d.get("type") not in VALID_TYPES:
        return jsonify({"error": "type must be 'Income' or 'Expense'"}), 400
    if not d.get("amount") or float(d["amount"]) <= 0:
        return jsonify({"error": "amount must be greater than 0"}), 400
    txn, error = add_transaction(
        user_id=d["user_id"], type=d["type"], category=d["category"],
        title=d["title"], amount=d["amount"], date=d["date"], notes=d.get("notes")
    )
    if error:
        return jsonify({"error": error}), 404
    return jsonify(txn.to_dict()), 201

@txn_bp.get("/transactions/<int:user_id>")
def list_txns(user_id):
    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)
    txns = get_transactions(user_id, month, year)
    return jsonify([t.to_dict() for t in txns])

@txn_bp.get("/transactions/<int:user_id>/summary")
def summary(user_id):
    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)
    if not month or not year:
        return jsonify({"error": "month and year required"}), 400
    return jsonify(get_category_summary(user_id, month, year))

@txn_bp.put("/transactions/<int:transaction_id>/edit")
def update(transaction_id):
    d = request.json
    if d.get("type") and d["type"] not in VALID_TYPES:
        return jsonify({"error": "type must be 'Income' or 'Expense'"}), 400
    if d.get("amount") and float(d["amount"]) <= 0:
        return jsonify({"error": "amount must be greater than 0"}), 400
    txn, error = update_transaction(transaction_id, d)
    if error:
        return jsonify({"error": error}), 404
    return jsonify(txn.to_dict())

@txn_bp.delete("/transactions/<int:transaction_id>/delete")
def delete(transaction_id):
    error = delete_transaction(transaction_id)
    if error:
        return jsonify({"error": error}), 404
    return jsonify({"message": "Transaction deleted successfully"})
