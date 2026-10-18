from pydantic import BaseModel


class InsightItem(BaseModel):
    type: str
    title: str
    message: str

