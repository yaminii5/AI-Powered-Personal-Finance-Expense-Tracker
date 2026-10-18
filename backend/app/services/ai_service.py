import json
import urllib.request
import calendar
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.transaction_service import get_transactions, get_category_summary


def generate_ai_insights(
    db: Session,
    user_id: int,
    month: int,
    year: int,
) -> List[Dict[str, Any]]:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured on the backend server.")

    user = db.get(User, user_id)
    if not user:
        raise ValueError(f"User with ID {user_id} not found.")

    summary = get_category_summary(db, user_id=user_id, month=month, year=year)
    all_txns = get_transactions(db, user_id=user_id)
    recent_txns = [
        {
            "type": t.type,
            "category": t.category,
            "amount": float(t.amount),
            "date": t.date.isoformat(),
            "title": t.title,
        }
        for t in all_txns[:30]
    ]

    month_name = calendar.month_name[month]

    prompt = f"""You are a personal finance analyst. Analyze this user's expense data and return ONLY a JSON array of insight objects.

User: {user.first_name} ({user.username})
Current Balance: ₹{float(user.current_balance):,.2f}
Month being analyzed: {month_name} {year}

Monthly Summary:
- Income by category: {json.dumps(summary.get('income', {}))}
- Expenses by category: {json.dumps(summary.get('expense', {}))}

Recent transactions (up to 30): {json.dumps(recent_txns)}

Return ONLY a valid JSON array (no markdown code blocks, no explanation) with 3 to 5 insight objects. Each object must have:
- "type": one of "warning", "tip", "pattern", "positive"
- "title": short title (max 6 words)
- "message": specific insight with actual numbers from the data (max 25 words)

Example format:
[{{"type":"warning","title":"High Food Spending","message":"You spent ₹4,200 on food this month, which represents 35% of your total expenses."}}]"""

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }

    req = urllib.request.Request(
        settings.GROQ_API_URL,
        headers={
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "ExpenseTrackerBackend/1.0",
        },
        data=json.dumps(payload).encode("utf-8"),
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Groq API error ({e.code}): {err_msg}")
    except Exception as e:
        raise RuntimeError(f"Failed to communicate with Groq API: {str(e)}")

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "[]")
    cleaned = content.replace("```json", "").replace("```", "").strip()

    try:
        insights = json.loads(cleaned)
        if isinstance(insights, list):
            return insights
        return []
    except Exception:
        return [
            {
                "type": "tip",
                "title": "Monthly Spending Overview",
                "message": cleaned[:120] if cleaned else "No insights could be parsed.",
            }
        ]

