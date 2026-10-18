from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analysis import MonthlyAnalysisResponse
from app.services import analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.get("/{user_id}", response_model=MonthlyAnalysisResponse)
def get_monthly_analysis(
    user_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    return analysis_service.get_monthly_analysis(db, user_id=user_id, month=month, year=year)

