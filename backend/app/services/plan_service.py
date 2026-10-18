from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.plan import Plan, PlanItem
from app.models.user import User
from app.schemas.plan import (
    PlanCreate,
    PlanUpdate,
    PlanItemCreate,
    PlanItemUpdate,
)


def _item_to_dict(item: PlanItem) -> Dict[str, Any]:
    est = float(item.estimated_amount or 0.0)
    act = float(item.actual_amount) if item.actual_amount is not None else None
    var = (est - act) if (item.is_paid and act is not None) else 0.0

    return {
        "item_id": item.item_id,
        "plan_id": item.plan_id,
        "title": item.title,
        "category": item.category,
        "estimated_amount": est,
        "actual_amount": act,
        "is_paid": item.is_paid,
        "paid_date": item.paid_date,
        "notes": item.notes,
        "variance": round(var, 2),
    }


def _plan_summary_dict(plan: Plan) -> Dict[str, Any]:
    total_est = sum(float(it.estimated_amount or 0.0) for it in plan.items)
    paid_items = [it for it in plan.items if it.is_paid and it.actual_amount is not None]
    total_act = sum(float(it.actual_amount) for it in paid_items)
    target = float(plan.target_budget or 0.0)

    # Net variance: sum of (estimated - actual) for all paid items
    net_var = sum(float(it.estimated_amount or 0.0) - float(it.actual_amount) for it in paid_items)

    return {
        "plan_id": plan.plan_id,
        "user_id": plan.user_id,
        "name": plan.name,
        "category_type": plan.category_type,
        "target_budget": target,
        "start_date": plan.start_date,
        "end_date": plan.end_date,
        "status": plan.status,
        "notes": plan.notes,
        "created_at": plan.created_at,
        "total_estimated": round(total_est, 2),
        "total_actual": round(total_act, 2),
        "remaining_target": round(target - total_act, 2),
        "net_variance": round(net_var, 2),
        "items_count": len(plan.items),
        "paid_items_count": len(paid_items),
    }


def list_plans(db: Session, user_id: int) -> List[Dict[str, Any]]:
    stmt = (
        select(Plan)
        .where(Plan.user_id == user_id)
        .order_by(Plan.created_at.desc())
    )
    plans = db.scalars(stmt).all()
    return [_plan_summary_dict(p) for p in plans]


def get_plan_details(db: Session, plan_id: int) -> Optional[Dict[str, Any]]:
    plan = db.get(Plan, plan_id)
    if not plan:
        return None
    summary = _plan_summary_dict(plan)
    summary["items"] = [_item_to_dict(it) for it in plan.items]
    return summary


def create_plan(db: Session, user_id: int, plan_in: PlanCreate) -> Dict[str, Any]:
    user = db.get(User, user_id)
    if not user:
        raise ValueError(f"User with ID {user_id} not found.")

    plan = Plan(
        user_id=user_id,
        name=plan_in.name,
        category_type=plan_in.category_type,
        target_budget=plan_in.target_budget,
        start_date=plan_in.start_date,
        end_date=plan_in.end_date,
        status=plan_in.status or "Planning",
        notes=plan_in.notes,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return get_plan_details(db, plan.plan_id)


def update_plan(db: Session, plan_id: int, plan_in: PlanUpdate) -> Optional[Dict[str, Any]]:
    plan = db.get(Plan, plan_id)
    if not plan:
        return None

    data = plan_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return get_plan_details(db, plan.plan_id)


def delete_plan(db: Session, plan_id: int) -> bool:
    plan = db.get(Plan, plan_id)
    if not plan:
        return False
    db.delete(plan)
    db.commit()
    return True


def add_plan_item(db: Session, plan_id: int, item_in: PlanItemCreate) -> Dict[str, Any]:
    plan = db.get(Plan, plan_id)
    if not plan:
        raise ValueError(f"Plan with ID {plan_id} not found.")

    is_paid = item_in.is_paid
    # If an actual amount was provided and is_paid wasn't explicitly set, mark as paid
    if item_in.actual_amount is not None and not is_paid:
        is_paid = True

    item = PlanItem(
        plan_id=plan_id,
        title=item_in.title,
        category=item_in.category or "General",
        estimated_amount=item_in.estimated_amount,
        actual_amount=item_in.actual_amount,
        is_paid=is_paid,
        paid_date=item_in.paid_date,
        notes=item_in.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_to_dict(item)


def update_plan_item(db: Session, item_id: int, item_in: PlanItemUpdate) -> Optional[Dict[str, Any]]:
    item = db.get(PlanItem, item_id)
    if not item:
        return None

    data = item_in.model_dump(exclude_unset=True)

    # Auto-infer is_paid if actual_amount is passed
    if "actual_amount" in data and data["actual_amount"] is not None and "is_paid" not in data:
        data["is_paid"] = True

    for field, value in data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return _item_to_dict(item)


def delete_plan_item(db: Session, item_id: int) -> bool:
    item = db.get(PlanItem, item_id)
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def bulk_add_plan_items(
    db: Session, plan_id: int, items_in: List[PlanItemCreate]
) -> List[Dict[str, Any]]:
    plan = db.get(Plan, plan_id)
    if not plan:
        raise ValueError(f"Plan with ID {plan_id} not found.")

    created = []
    for it in items_in:
        is_paid = it.is_paid
        if it.actual_amount is not None and not is_paid:
            is_paid = True
        item = PlanItem(
            plan_id=plan_id,
            title=it.title,
            category=it.category or "General",
            estimated_amount=it.estimated_amount,
            actual_amount=it.actual_amount,
            is_paid=is_paid,
            paid_date=it.paid_date,
            notes=it.notes,
        )
        db.add(item)
        created.append(item)

    db.commit()
    for it in created:
        db.refresh(it)
    return [_item_to_dict(it) for it in created]


