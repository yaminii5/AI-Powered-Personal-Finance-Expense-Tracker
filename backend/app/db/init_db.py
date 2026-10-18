from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    print("Creating tables in PostgreSQL...")
    init_db()
    print("Tables created successfully.")

