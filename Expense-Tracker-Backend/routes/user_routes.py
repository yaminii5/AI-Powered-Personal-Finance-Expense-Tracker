from flask import Blueprint, request, jsonify
from services.user_service import create_user, get_user, update_user, delete_user

user_bp = Blueprint("users", __name__)

@user_bp.post("/users")
def register():
    data = request.json
    username = data.get("username", "").strip()
    first_name = data.get("first_name", "").strip()
    if not username or not first_name:
        return jsonify({"error": "username and first_name are required"}), 400
    user, error = create_user(username, first_name)
    if error:
        return jsonify({"error": error}), 409
    return jsonify(user.to_dict()), 201

@user_bp.get("/users/<username>")
def profile(username):
    user = get_user(username)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())

@user_bp.put("/users/<username>")
def update(username):
    data = request.json
    first_name = data.get("first_name", "").strip()
    if not first_name:
        return jsonify({"error": "first_name is required"}), 400
    user, error = update_user(username, first_name)
    if error:
        return jsonify({"error": error}), 404
    return jsonify(user.to_dict())

@user_bp.delete("/users/<username>")
def remove(username):
    error = delete_user(username)
    if error:
        return jsonify({"error": error}), 404
    return jsonify({"message": f"User '{username}' deleted successfully"})
