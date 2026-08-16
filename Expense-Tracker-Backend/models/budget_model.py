from db.db_connection import db

class Budget(db.Model):
    __tablename__ = "budgets"

    budget_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    limit_amount = db.Column(db.Numeric(10, 2), nullable=False)

    def to_dict(self):
        return {
            "budget_id": self.budget_id,
            "user_id": self.user_id,
            "month": self.month,
            "year": self.year,
            "limit_amount": float(self.limit_amount)
        }
