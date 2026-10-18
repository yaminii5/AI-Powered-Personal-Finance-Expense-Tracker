# AI-Powered Personal Finance & Expense Tracker

A full-stack personal finance and expense tracking application built with **FastAPI**, **PostgreSQL**, and **React 19 (Vite + JSX)** featuring automated spending analytics, real-time balance tracking, and AI-driven insights powered by Groq.

---

## Tech Stack

* **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn
* **Database:** PostgreSQL (Local or Cloud like Neon DB / Supabase)
* **Frontend:** React 19, Vite 8, React Router v7, Vanilla CSS Design System (Light/Dark themes)
* **AI Engine:** Groq API (`openai/gpt-oss-20b` / `qwen/qwen3.8-27b`) via secure backend proxy

---

## Prerequisites

Before getting started, make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18.0 or higher) & `npm`
* [Python](https://www.python.org/) (v3.10 or higher)
* [PostgreSQL](https://www.postgresql.org/) (Running locally or a free cloud database like [Neon DB](https://neon.tech))
* [Git](https://git-scm.com/)

---

## Step-by-Step Setup Guide for New Users

### 1. Clone the Repository
```bash
git clone <YOUR_REPOSITORY_URL>
cd Expense-tracker
```

---

### 2. Backend Setup (FastAPI + PostgreSQL)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a Python virtual environment:**
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   * **Windows (PowerShell):**
     ```powershell
     Copy-Item .env.example .env
     ```
   * **macOS / Linux:**
     ```bash
     cp .env.example .env
     ```
   Open `backend/.env` and enter your database credentials and Groq API key:
   ```env
   # Local PostgreSQL Settings
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=expensetrackerdb
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password

   # Or Cloud Database (Neon DB / Supabase)
   # DATABASE_URL=postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require

   # Groq API Key (Free key from https://console.groq.com)
   GROQ_API_KEY=gsk_your_groq_api_key_here
   GROQ_MODEL=openai/gpt-oss-20b
   ```

5. **Initialize Database Tables:**
   ```bash
   python -m app.db.init_db
   ```

6. **Start the Backend Server:**
   ```bash
   python run.py
   # Or using uvicorn directly:
   # uvicorn app.main:app --reload --port 8000
   ```
   * Backend API: `http://localhost:8000`
   * Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`

---

### 3. Frontend Setup (Vite React JSX)

1. **Open a new terminal window and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   * **Windows (PowerShell):**
     ```powershell
     Copy-Item .env.example .env
     ```
   * **macOS / Linux:**
     ```bash
     cp .env.example .env
     ```
   The default `.env` points to the local backend:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

4. **Start the Frontend Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## Building for Production

### Build Frontend
```bash
cd frontend
npm run build
```
The optimized production bundle will be generated in `frontend/dist/`.

### Run Backend in Production
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Project Structure

```
Expense-tracker/
├── .gitignore            # Root git ignore (ignores node_modules, venv, .env, dist)
├── README.md             # Project documentation
│
├── backend/
│   ├── app/
│   │   ├── core/         # Settings & environment configuration
│   │   ├── db/           # Database engine, session, Base, and init_db script
│   │   ├── models/       # SQLAlchemy 2.0 ORM models (User, Transaction, Budget)
│   │   ├── schemas/      # Pydantic v2 validation & response schemas
│   │   ├── services/     # Business logic & atomic balance updates & AI service
│   │   ├── routers/      # API endpoints (/users, /transactions, /budgets, /analysis, /insights)
│   │   └── main.py       # FastAPI application & CORS configuration
│   ├── .env.example      # Sample backend environment configuration
│   ├── .gitignore        # Backend git ignore (ignores venv, .env, __pycache__)
│   ├── requirements.txt  # Python package dependencies
│   └── run.py            # Development runner
│
└── frontend/
    ├── src/
    │   ├── components/   # Auth, Dashboard, DonutChart, InsightsModal, ThemeToggle, Toast, etc.
    │   ├── pages/        # AnalysisPage, TransactionsPage, BudgetsPage, SettingsPage
    │   ├── services/     # API integration & AI client
    │   ├── App.jsx       # Root router & user session provider
    │   ├── index.css     # Design tokens, typography, dark/light themes
    │   └── App.css       # Animations & responsive utilities
    ├── .env.example      # Sample frontend environment configuration
    ├── .gitignore        # Frontend git ignore (ignores node_modules, dist, .env)
    ├── package.json      # Dependencies and scripts
    └── vite.config.js    # Vite configuration
```
