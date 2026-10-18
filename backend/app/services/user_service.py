from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    stmt = select(User).where(User.username == username)
    return db.scalars(stmt).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.get(User, user_id)


def create_user(db: Session, user_in: UserCreate) -> tuple[Optional[User], Optional[str]]:
    existing = get_user_by_username(db, user_in.username.strip())
    if existing:
        return None, f"Username '{user_in.username}' is already taken"
    user = User(
        username=user_in.username.strip(),
        first_name=user_in.first_name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, None


def update_user(db: Session, username: str, user_in: UserUpdate) -> tuple[Optional[User], Optional[str]]:
    user = get_user_by_username(db, username)
    if not user:
        return None, "User not found"
    user.first_name = user_in.first_name.strip()
    db.commit()
    db.refresh(user)
    return user, None


def delete_user(db: Session, username: str) -> Optional[str]:
    user = get_user_by_username(db, username)
    if not user:
        return "User not found"
    db.delete(user)
    db.commit()
    return None

