from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.plan import (
    PlanCreate,
    PlanUpdate,
    PlanSummaryResponse,
    PlanDetailResponse,
    PlanItemCreate,
    PlanItemUpdate,
    PlanItemResponse,
    PlanAiSuggestRequest,
    PlanAiSuggestResponse,
    PlanAiAskRequest,
    PlanAiAskResponse,
)
from app.services import plan_service
from app.services import plan_ai_service

router = APIRouter(prefix="/plans", tags=["Budget Planner"])


@router.get("/user/{user_id}", response_model=List[PlanSummaryResponse])
def get_user_plans(user_id: int, db: Session = Depends(get_db)):
    return plan_service.list_plans(db, user_id)


@router.post("/user/{user_id}", response_model=PlanDetailResponse, status_code=status.HTTP_201_CREATED)
def create_new_plan(user_id: int, plan_in: PlanCreate, db: Session = Depends(get_db)):
    try:
        return plan_service.create_plan(db, user_id, plan_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{plan_id}", response_model=PlanDetailResponse)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = plan_service.get_plan_details(db, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.put("/{plan_id}", response_model=PlanDetailResponse)
def update_plan(plan_id: int, plan_in: PlanUpdate, db: Session = Depends(get_db)):
    plan = plan_service.update_plan(db, plan_id, plan_in)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.delete("/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    success = plan_service.delete_plan(db, plan_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return {"message": "Plan deleted successfully"}


# --- Plan Items Endpoints ---

@router.post("/{plan_id}/items", response_model=PlanItemResponse, status_code=status.HTTP_201_CREATED)
def add_item_to_plan(plan_id: int, item_in: PlanItemCreate, db: Session = Depends(get_db)):
    try:
        return plan_service.add_plan_item(db, plan_id, item_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/items/{item_id}", response_model=PlanItemResponse)
def update_plan_item(item_id: int, item_in: PlanItemUpdate, db: Session = Depends(get_db)):
    item = plan_service.update_plan_item(db, item_id, item_in)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan item not found")
    return item


@router.delete("/items/{item_id}")
def delete_plan_item(item_id: int, db: Session = Depends(get_db)):
    success = plan_service.delete_plan_item(db, item_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan item not found")
    return {"message": "Plan item deleted successfully"}


@router.post("/{plan_id}/items/bulk", response_model=List[PlanItemResponse], status_code=status.HTTP_201_CREATED)
def bulk_add_items(plan_id: int, items_in: List[PlanItemCreate], db: Session = Depends(get_db)):
    try:
        return plan_service.bulk_add_plan_items(db, plan_id, items_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# --- AI Planner Endpoints ---

@router.post("/ai-suggest", response_model=PlanAiSuggestResponse)
def get_ai_plan_suggestion(request: PlanAiSuggestRequest):
    try:
        return plan_ai_service.generate_plan_breakdown(request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {str(e)}")


@router.post("/ai-ask", response_model=PlanAiAskResponse)
def ask_ai_plan_advisor(request: PlanAiAskRequest, db: Session = Depends(get_db)):
    try:
        return plan_ai_service.ask_plan_advisor(db, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {str(e)}")

