from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.services import budget_service

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def set_budget(b_in: BudgetCreate, db: Session = Depends(get_db)):
    budget, error, code = budget_service.set_budget(db, b_in)
    if error:
        raise HTTPException(status_code=code, detail=error)
    return budget


@router.get("/{user_id}", response_model=List[BudgetResponse])
def list_budgets(user_id: int, db: Session = Depends(get_db)):
    return budget_service.get_budgets_by_user(db, user_id)


@router.put("/{budget_id}/update", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    b_in: BudgetUpdate,
    db: Session = Depends(get_db),
):
    budget, error = budget_service.update_budget(db, budget_id, b_in)
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    return budget


@router.delete("/{budget_id}/delete")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    error = budget_service.delete_budget(db, budget_id)
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    return {"message": "Budget deleted successfully"}

