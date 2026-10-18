from typing import Optional
from pydantic import BaseModel


class MonthlyAnalysisResponse(BaseModel):
    month: int
    year: int
    total_income: float
    total_expenses: float
    savings: float
    budget_limit: Optional[float] = None
    budget_used: float
    within_budget: Optional[bool] = None

