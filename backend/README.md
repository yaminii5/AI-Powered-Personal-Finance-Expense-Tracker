# Expense Tracker Backend (FastAPI + PostgreSQL)

FastAPI backend with SQLAlchemy 2.0, Pydantic v2, and PostgreSQL.

## Features
- Modular Clean Architecture: `core`, `db`, `models`, `schemas`, `services`, `routers`
- Real-time Balance Tracking: Automatic user balance calculation on transactions create, edit, and delete
- Budget Limits & Monthly Analytics: Dynamic category spending breakdowns and budget tracking
- Automatic OpenAPI / Swagger Documentation at `/docs`
- Dual Database Support: Connects to local PostgreSQL by default, with one-line switch to Neon DB / hosted Postgres via `DATABASE_URL`

## Setup & Running

### 1. Environment Configuration (`.env`)
Create or edit `.env` in the `backend/` folder:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expensetrackerdb
DB_USER=postgres
DB_PASSWORD=your_password

# Optional: To switch to Neon DB or another hosted Postgres in the future, simply uncomment:
# DATABASE_URL=postgresql://user:password@ep-...neon.tech/neondb?sslmode=require
```

### 2. Activate Virtual Environment
```powershell
.\venv\Scripts\Activate.ps1
```

### 3. Initialize Database Tables
```powershell
python -m app.db.init_db
```

### 4. Run Development Server
```powershell
python run.py
# or: uvicorn app.main:app --reload --port 8000
```
API runs at `http://127.0.0.1:8000`.
Interactive Swagger UI docs: `http://127.0.0.1:8000/docs`

