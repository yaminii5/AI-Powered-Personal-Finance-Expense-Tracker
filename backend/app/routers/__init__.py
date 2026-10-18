from app.routers.users import router as users_router
from app.routers.transactions import router as transactions_router
from app.routers.budgets import router as budgets_router
from app.routers.analysis import router as analysis_router
from app.routers.insights import router as insights_router

__all__ = [
    "users_router",
    "transactions_router",
    "budgets_router",
    "analysis_router",
    "insights_router",
]
