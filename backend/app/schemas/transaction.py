from datetime import date
from typing import Optional, Literal, Dict
from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    type: Literal["Income", "Expense"]
    category: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)
    date: date
    notes: Optional[str] = Field(None, max_length=255)


class TransactionCreate(TransactionBase):
    user_id: int


class TransactionUpdate(BaseModel):
    type: Optional[Literal["Income", "Expense"]] = None
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=255)


class TransactionResponse(TransactionBase):
    transaction_id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


class CategorySummaryResponse(BaseModel):
    income: Dict[str, float] = {}
    expense: Dict[str, float] = {}

