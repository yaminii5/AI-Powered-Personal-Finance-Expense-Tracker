from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.insight import InsightItem
from app.services.ai_service import generate_ai_insights

router = APIRouter(prefix="/insights", tags=["AI Insights"])


@router.get("/{user_id}", response_model=List[InsightItem])
def get_insights(
    user_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    try:
        return generate_ai_insights(db, user_id=user_id, month=month, year=year)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

