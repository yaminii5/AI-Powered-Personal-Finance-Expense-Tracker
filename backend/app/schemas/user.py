from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)


class UserCreate(UserBase):
    username: str = Field(..., min_length=1, max_length=50)


class UserUpdate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)


class UserResponse(UserBase):
    user_id: int
    username: str
    current_balance: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

