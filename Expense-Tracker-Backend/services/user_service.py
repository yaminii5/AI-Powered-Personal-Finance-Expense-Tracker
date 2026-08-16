from db.db_connection import db
from models.user_model import User

def create_user(username, first_name):
    if User.query.filter_by(username=username).first():
        return None, f"Username '{username}' is already taken"
    user = User(username=username, first_name=first_name)
    db.session.add(user)
    db.session.commit()
    return user, None

def get_user(username):
    return User.query.filter_by(username=username).first()

def update_user(username, first_name):
    user = User.query.filter_by(username=username).first()
    if not user:
        return None, "User not found"
    user.first_name = first_name
    db.session.commit()
    return user, None

def delete_user(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return "User not found"
    db.session.delete(user)
    db.session.commit()
    return None
