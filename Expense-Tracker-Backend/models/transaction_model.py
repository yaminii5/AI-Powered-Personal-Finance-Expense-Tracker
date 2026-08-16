from db.db_connection import db
from datetime import date

class Transaction(db.Model):
    __tablename__ = "transactions"

    transaction_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    type = db.Column(db.String(10), nullable=False)       # 'Income' or 'Expense'
    category = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    date = db.Column(db.Date, default=date.today)
    notes = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            "transaction_id": self.transaction_id,
            "user_id": self.user_id,
            "type": self.type,
            "category": self.category,
            "title": self.title,
            "amount": float(self.amount),
            "date": self.date.isoformat(),
            "notes": self.notes
        }
