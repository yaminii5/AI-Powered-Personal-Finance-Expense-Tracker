from pydantic import BaseModel, ConfigDict, Field


class BudgetBase(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    limit_amount: float = Field(..., gt=0)


class BudgetCreate(BudgetBase):
    user_id: int


class BudgetUpdate(BaseModel):
    limit_amount: float = Field(..., gt=0)


class BudgetResponse(BudgetBase):
    budget_id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)

