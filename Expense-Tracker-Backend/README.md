# Expense Tracker API

A personal finance REST API built with Flask and PostgreSQL. Manage users, income/expense transactions, monthly budgets, and financial analysis.

---

## Tech Stack

- **Framework:** Flask
- **Database:** PostgreSQL (via SQLAlchemy + Flask-Migrate)
- **ORM:** Flask-SQLAlchemy
- **Migrations:** Alembic (Flask-Migrate)
- **Docs:** Swagger UI (`/api/docs`)
- **Deployment:** Render (Gunicorn)

---

## Project Structure

```
Expense-Tracker/
├── app.py                  # App factory, blueprints, Swagger UI
├── config.py               # Config (DB URL, CORS)
├── Procfile                # Gunicorn start command
├── render.yaml             # Render deployment config
├── requirements.txt
├── .env.example
├── db/
│   └── db_connection.py    # SQLAlchemy instance
├── models/
│   ├── user_model.py
│   ├── transaction_model.py
│   └── budget_model.py
├── routes/
│   ├── user_routes.py
│   ├── transaction_routes.py
│   └── budget_routes.py
├── services/
│   ├── user_service.py
│   ├── transaction_service.py
│   └── analysis_service.py
├── migrations/             # Alembic migration files
└── static/
    └── swagger.yaml        # OpenAPI 3.0 spec
```

---

## Local Setup

**1. Clone & create virtual environment**
```bash
git clone <repo-url>
cd Expense-Tracker
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

**2. Install dependencies**
```bash
pip install -r requirements.txt
```

**3. Configure environment**
```bash
cp .env.example .env
# Edit .env with your values
```

**.env variables:**
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
CORS_ORIGINS=https://your-frontend.vercel.app
```

**4. Run migrations**
```bash
flask db upgrade
```

**5. Start the server**
```bash
flask run
# or
gunicorn app:app
```

API runs at `http://localhost:5000`  
Swagger UI at `http://localhost:5000/api/docs`

---

## Data Models

### User
| Field | Type | Notes |
|---|---|---|
| user_id | Integer | Primary key |
| username | String(50) | Unique |
| first_name | String(50) | |
| current_balance | Numeric(10,2) | Auto-updated on transactions |
| created_at | DateTime | |

### Transaction
| Field | Type | Notes |
|---|---|---|
| transaction_id | Integer | Primary key |
| user_id | Integer | FK → users |
| type | String | `Income` or `Expense` |
| category | String(50) | e.g. Food, Salary |
| title | String(100) | |
| amount | Numeric(10,2) | Must be > 0 |
| date | Date | |
| notes | String(255) | Optional |

### Budget
| Field | Type | Notes |
|---|---|---|
| budget_id | Integer | Primary key |
| user_id | Integer | FK → users |
| month | Integer | 1–12 |
| year | Integer | |
| limit_amount | Numeric(10,2) | Monthly expense limit |

---

## API Endpoints

All routes are prefixed with `/api`.

### Users

| Method | Endpoint | Description |
|---|---|---|
| POST | `/users` | Register a new user |
| GET | `/users/<username>` | Get user profile & balance |
| PUT | `/users/<username>` | Update first name |
| DELETE | `/users/<username>` | Delete user |

**POST /api/users**
```json
{ "username": "john0", "first_name": "John" }
```

---

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/transactions` | Add income or expense |
| GET | `/transactions/<user_id>` | List transactions (optional `?month=&year=`) |
| GET | `/transactions/<user_id>/summary` | Category-wise breakdown (`?month=&year=` required) |
| PUT | `/transactions/<transaction_id>/edit` | Update transaction (balance auto-recalculated) |
| DELETE | `/transactions/<transaction_id>/delete` | Delete transaction (balance auto-recalculated) |

**POST /api/transactions**
```json
{
  "user_id": 1,
  "type": "Expense",
  "category": "Food",
  "title": "Dominos Pizza",
  "amount": 300,
  "date": "2026-05-15",
  "notes": "Late night order"
}
```

**GET /api/transactions/1/summary?month=5&year=2026**
```json
{
  "income": { "Salary": 20000 },
  "expense": { "Food": 3000, "Travel": 2000 }
}
```

---

### Budgets

| Method | Endpoint | Description |
|---|---|---|
| POST | `/budgets` | Set monthly budget (one per month/year) |
| GET | `/budgets/<user_id>` | List all budgets for a user |
| PUT | `/budgets/<budget_id>/update` | Update budget limit |
| DELETE | `/budgets/<budget_id>/delete` | Delete a budget |

**POST /api/budgets**
```json
{ "user_id": 1, "month": 5, "year": 2026, "limit_amount": 12000 }
```

---

### Analysis

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analysis/<user_id>` | Monthly income, expenses, savings & budget status |

**GET /api/analysis/1?month=5&year=2026**
```json
{
  "month": 5,
  "year": 2026,
  "total_income": 20000,
  "total_expenses": 5000,
  "savings": 15000,
  "budget_limit": 12000,
  "budget_used": 5000,
  "within_budget": true
}
```

---

## Balance Logic

`current_balance` on the User is automatically maintained:
- **Add Income** → balance increases
- **Add Expense** → balance decreases
- **Edit transaction** → old effect is reversed, new effect is applied
- **Delete transaction** → effect is reversed

---

## Deployment (Render)

The `render.yaml` defines the web service:

```yaml
services:
  - type: web
    name: expense-tracker-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
    envVars:
      - key: DATABASE_URL
      - key: CORS_ORIGINS
```

Set `DATABASE_URL` and `CORS_ORIGINS` in the Render dashboard environment variables.

---

## API Documentation

Interactive Swagger UI is available at:
```
http://localhost:5000/api/docs
```
Spec file: `static/swagger.yaml` (OpenAPI 3.0.3)
