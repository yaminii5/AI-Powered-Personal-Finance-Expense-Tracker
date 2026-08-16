from flask import Flask, send_from_directory
from flask_migrate import Migrate
from flask_cors import CORS
from flask_swagger_ui import get_swaggerui_blueprint
from config import Config
from db.db_connection import db

from routes.user_routes import user_bp
from routes.transaction_routes import txn_bp
from routes.budget_routes import budget_bp

app = Flask(__name__)
app.config.from_object(Config)

CORS(app, origins=["https://expense-tracker-app00.netlify.app"], supports_credentials=False)
# CORS(app, origins=["http://localhost:3000"], supports_credentials=False)

db.init_app(app)
migrate = Migrate(app, db)

app.register_blueprint(user_bp, url_prefix="/api")
app.register_blueprint(txn_bp, url_prefix="/api")
app.register_blueprint(budget_bp, url_prefix="/api")

# Serve swagger.yaml from /static
@app.get("/static/swagger.yaml")
def swagger_spec():
    return send_from_directory("static", "swagger.yaml")

# Swagger UI at /api/docs
swaggerui_bp = get_swaggerui_blueprint(
    "/api/docs",
    "/static/swagger.yaml",
    config={"app_name": "Expense Tracker API"}
)
app.register_blueprint(swaggerui_bp)

# import models so migrate can detect them
from models import user_model, transaction_model, budget_model  # noqa

if __name__ == "__main__":
    app.run(debug=True)
