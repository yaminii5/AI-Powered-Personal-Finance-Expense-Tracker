from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    CategorySummaryResponse,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(txn_in: TransactionCreate, db: Session = Depends(get_db)):
    txn, error = transaction_service.add_transaction(db, txn_in)
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    return txn


@router.get("/{user_id}", response_model=List[TransactionResponse])
def list_transactions(
    user_id: int,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    limit: Optional[int] = Query(None, ge=1, le=1000),
    offset: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    return transaction_service.get_transactions(
        db, user_id=user_id, month=month, year=year, limit=limit, offset=offset
    )


@router.get("/{user_id}/summary", response_model=CategorySummaryResponse)
def get_summary(
    user_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    return transaction_service.get_category_summary(db, user_id=user_id, month=month, year=year)


@router.put("/{transaction_id}/edit", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    txn_in: TransactionUpdate,
    db: Session = Depends(get_db),
):
    txn, error = transaction_service.update_transaction(db, transaction_id, txn_in)
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    return txn


@router.delete("/{transaction_id}/delete")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    error = transaction_service.delete_transaction(db, transaction_id)
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    return {"message": "Transaction deleted successfully"}

