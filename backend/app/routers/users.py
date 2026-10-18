from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserUpdate, UserResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user, error = user_service.create_user(db, user_in)
    if error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error)
    return user


@router.post("/login", response_model=UserResponse)
def login_user(login_in: UserLogin, db: Session = Depends(get_db)):
    user, error = user_service.authenticate_user(db, login_in.username, login_in.password)
    if error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)
    return user


@router.get("/{username}", response_model=UserResponse)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = user_service.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{username}", response_model=UserResponse)
def update_user_profile(username: str, user_in: UserUpdate, db: Session = Depends(get_db)):
    user, error = user_service.update_user(db, username, user_in)
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    return user


@router.delete("/{username}")
def remove_user(username: str, db: Session = Depends(get_db)):
    error = user_service.delete_user(db, username)
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    return {"message": f"User '{username}' deleted successfully"}

