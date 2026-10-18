from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# --- Plan Item Schemas ---

class PlanItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    category: str = Field(default="General", max_length=50)
    estimated_amount: float = Field(default=0.0, ge=0)
    actual_amount: Optional[float] = Field(default=None, ge=0)
    is_paid: bool = Field(default=False)
    paid_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=255)


class PlanItemCreate(PlanItemBase):
    pass


class PlanItemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    category: Optional[str] = Field(default=None, max_length=50)
    estimated_amount: Optional[float] = Field(default=None, ge=0)
    actual_amount: Optional[float] = Field(default=None, ge=0)
    is_paid: Optional[bool] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=255)


class PlanItemResponse(PlanItemBase):
    item_id: int
    plan_id: int
    variance: float = 0.0  # estimated_amount - actual_amount (positive = saved, negative = over)

    model_config = ConfigDict(from_attributes=True)


# --- Plan Schemas ---

class PlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category_type: str = Field(default="Trip", max_length=50)
    target_budget: float = Field(default=0.0, ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = Field(default="Planning", max_length=20)
    notes: Optional[str] = None


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    category_type: Optional[str] = Field(default=None, max_length=50)
    target_budget: Optional[float] = Field(default=None, ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = None


class PlanSummaryResponse(PlanBase):
    plan_id: int
    user_id: int
    created_at: datetime
    total_estimated: float = 0.0
    total_actual: float = 0.0
    remaining_target: float = 0.0
    net_variance: float = 0.0
    items_count: int = 0
    paid_items_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PlanDetailResponse(PlanSummaryResponse):
    items: List[PlanItemResponse] = []

