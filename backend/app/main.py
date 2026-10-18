from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.routers import (
    users_router,
    transactions_router,
    budgets_router,
    analysis_router,
    insights_router,
    plans_router,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Personal Finance & Expense Tracker REST API with FastAPI and PostgreSQL",
    version="1.0.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Ensure tables exist on startup
    init_db()


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "docs": "/docs",
    }


# Include all modular routers under /api
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(transactions_router, prefix=settings.API_V1_STR)
app.include_router(budgets_router, prefix=settings.API_V1_STR)
app.include_router(analysis_router, prefix=settings.API_V1_STR)
app.include_router(insights_router, prefix=settings.API_V1_STR)
app.include_router(plans_router, prefix=settings.API_V1_STR)