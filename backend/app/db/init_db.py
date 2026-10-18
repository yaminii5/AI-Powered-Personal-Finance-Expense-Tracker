from sqlalchemy import text
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401


def init_db():
    Base.metadata.create_all(bind=engine)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);"))
    except Exception as e:
        print(f"Schema migration warning: {e}")


if __name__ == "__main__":
    print("Creating tables in PostgreSQL...")
    init_db()
    print("Tables created successfully.")

