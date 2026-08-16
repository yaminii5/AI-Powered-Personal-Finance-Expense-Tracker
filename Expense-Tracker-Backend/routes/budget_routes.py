from flask import Blueprint, request, jsonify
from db.db_connection import db
from models.budget_model import Budget
from models.user_model import User
from services.analysis_service import get_monthly_analysis

budget_bp = Blueprint("budgets", __name__)

@budget_bp.post("/budgets")
def set_budget():
    d = request.json
    if not User.query.get(d.get("user_id")):
        return jsonify({"error": "User not found"}), 404
    existing = Budget.query.filter_by(
        user_id=d["user_id"], month=d["month"], year=d["year"]
    ).first()
    if existing:
        return jsonify({"error": "Budget already exists for this month/year. Use PUT to update."}), 409
    budget = Budget(
        user_id=d["user_id"], month=d["month"],
        year=d["year"], limit_amount=d["limit_amount"]
    )
    db.session.add(budget)
    db.session.commit()
    return jsonify(budget.to_dict()), 201

@budget_bp.get("/budgets/<int:user_id>")
def list_budgets(user_id):
    budgets = Budget.query.filter_by(user_id=user_id).order_by(
        Budget.year.desc(), Budget.month.desc()
    ).all()
    return jsonify([b.to_dict() for b in budgets])

@budget_bp.put("/budgets/<int:budget_id>/update")
def update_budget(budget_id):
    budget = Budget.query.get(budget_id)
    if not budget:
        return jsonify({"error": "Budget not found"}), 404
    d = request.json
    if not d.get("limit_amount") or float(d["limit_amount"]) <= 0:
        return jsonify({"error": "limit_amount must be greater than 0"}), 400
    budget.limit_amount = d["limit_amount"]
    db.session.commit()
    return jsonify(budget.to_dict())

@budget_bp.delete("/budgets/<int:budget_id>/delete")
def delete_budget(budget_id):
    budget = Budget.query.get(budget_id)
    if not budget:
        return jsonify({"error": "Budget not found"}), 404
    db.session.delete(budget)
    db.session.commit()
    return jsonify({"message": "Budget deleted successfully"})

@budget_bp.get("/analysis/<int:user_id>")
def analysis(user_id):
    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)
    if not month or not year:
        return jsonify({"error": "month and year required"}), 400
    return jsonify(get_monthly_analysis(user_id, month, year))
