import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.plan import Plan
from app.schemas.plan import (
    PlanAiSuggestRequest,
    PlanAiSuggestResponse,
    PlanAiItemSuggestion,
    PlanAiAskRequest,
    PlanAiAskResponse,
)
from app.services.plan_service import get_plan_details


VALID_CATEGORIES = [
    "General",
    "Materials",
    "Labor",
    "Stay / Hotel",
    "Travel / Flight",
    "Food & Dining",
    "Activities",
    "Equipment",
    "Permits / Fees",
    "Shopping",
    "Other",
]


def _normalize_category(cat: str) -> str:
    c = (cat or "").lower()
    if any(k in c for k in ["train", "flight", "bus", "travel", "transport", "cab", "auto"]):
        return "Travel / Flight"
    if any(k in c for k in ["hostel", "hotel", "stay", "accommodation", "resort", "room", "lodge"]):
        return "Stay / Hotel"
    if any(k in c for k in ["food", "meal", "dining", "snack", "drink", "restaurant", "lunch", "dinner", "breakfast"]):
        return "Food & Dining"
    if any(k in c for k in ["activit", "sightseeing", "entry", "ticket", "cruise", "safari", "tour", "beach", "fort", "monument"]):
        return "Activities"
    if any(k in c for k in ["equipment", "scooter", "bike", "rental", "gear"]):
        return "Equipment"
    if any(k in c for k in ["material", "cement", "tile", "paint", "steel"]):
        return "Materials"
    if any(k in c for k in ["labor", "mason", "carpenter", "worker"]):
        return "Labor"
    if any(k in c for k in ["permit", "fee", "toll", "tax"]):
        return "Permits / Fees"
    if any(k in c for k in ["shop", "gift", "souvenir", "cloth"]):
        return "Shopping"
    return "Other"


def _call_groq_api(
    prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 4500,
    system_prompt: Optional[str] = None,
) -> str:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured on the backend server.")

    models_to_try = ["openai/gpt-oss-120b", settings.GROQ_MODEL, "qwen/qwen3.8-27b"]

    default_sys_prompt = (
        "You are a hyper-detailed Indian event & travel budgeting expert. "
        "You provide exact train numbers/names, real place names, exact ticket entry fees, "
        "and day-by-day itineraries with costs in Indian Rupees (INR ₹). Output only valid JSON."
    )
    active_sys_prompt = system_prompt or default_sys_prompt

    last_error = None
    for model_name in models_to_try:
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "system",
                    "content": active_sys_prompt,
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "max_completion_tokens": max_tokens,
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
            with urllib.request.urlopen(req, timeout=35) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if content and content.strip():
                    return content.strip()
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="ignore")
            last_error = RuntimeError(f"Groq API error ({e.code}): {err_msg}")
            # Try next model if 429 or 404
            continue
        except Exception as e:
            last_error = RuntimeError(f"Failed to communicate with Groq API: {str(e)}")
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Groq API returned an empty response across all models.")


def generate_plan_breakdown(request: PlanAiSuggestRequest) -> PlanAiSuggestResponse:
    target = float(request.target_budget)

    prompt = f"""Event / Project Name: {request.name}
Category: {request.category_type}
Total Target Budget: ₹{target:,.2f}
Additional Notes / Context: {request.notes or 'None provided'}

You are a hyper-detailed Indian event & travel budgeting expert. The user wants an EXACT, highly specific, realistic itinerary and line-item cost breakdown in Indian Rupees (INR ₹).

STRICT SPECIFICITY RULES:
1. NEVER use vague, generic titles like "Train Travel", "Activities & Entry Fees", or "Misc Expenses".
2. Use REAL, CONCRETE names:
   - For Trips: Specify REAL train names & numbers (e.g., "MAS-VSG Vasco Express #17311 Sleeper Class Round-Trip") with exact IRCTC sleeper/3AC fares; or specific bus routes (e.g., "Kadamba AC Shuttle Bus from Madgaon to Panaji").
   - Specify REAL places to visit with their EXACT entry ticket costs (e.g., "Day 1: Fort Aguada Entry Ticket (₹50) & Sinquerim Beach", "Day 2: Chapora Fort (Free Entry) & Vagator Sunset", "Day 3: Basilica of Bom Jesus & ASI Museum (₹25 Entry)").
   - Specify REAL hostel/hotel types with per-night cost (e.g., "3 Nights Backpacker Dorm at Anjuna / Calangute @ ₹350/night").
   - Specify real local transport (e.g., "Activa / Scooter Rental for 1 Day @ ₹250/day + ₹150 Petrol").
3. For Renovations/Events: Specify real materials (e.g. "UltraTech 53 Grade Cement - 40 bags @ ₹380", "Asian Paints Royale Luxury Emulsion 20L", "Labor: 2 skilled masons for 4 days @ ₹900/day").
4. Provide a rich 'day_wise_itinerary' (array of strings for Day 1, Day 2, Day 3, Day 4 etc.) detailing the sequence of places visited, transport used, and meals.
5. The sum of all item estimated_amounts plus the contingency_buffer MUST equal or be within 2% of the Target Budget (₹{target:,.2f}).
6. Valid item categories are strictly one of: {', '.join(VALID_CATEGORIES)}.

Return ONLY valid JSON (no markdown fences, no ```json, no explanations) matching this exact format:
{{
  "summary": "Realistic specific overview of the plan and budget allocation strategy",
  "contingency_buffer": 200.0,
  "total_allocated": 3800.0,
  "items": [
    {{
      "title": "MAS-VSG Vasco Exp (#17311) Sleeper Class Round-Trip",
      "category": "Travel / Flight",
      "estimated_amount": 880.0,
      "notes": "Chennai Central (MAS) to Madgaon (MAO) Sleeper fare ₹440 one-way on IRCTC"
    }},
    {{
      "title": "Red Door / Whoopers Hostel Anjuna Dorm (3 Nights)",
      "category": "Stay / Hotel",
      "estimated_amount": 1050.0,
      "notes": "₹350/night dorm bed for 3 nights"
    }},
    {{
      "title": "Day 1: Fort Aguada Entry Ticket (₹50) + Local Dinner",
      "category": "Activities",
      "estimated_amount": 300.0,
      "notes": "Aguada Fort entry ₹50, Kadamba bus ₹40, Goan fish thali dinner ₹210"
    }}
  ],
  "day_wise_itinerary": [
    "Day 1: Arrive at Madgaon railway station via Vasco Express. Take Kadamba shuttle bus (₹45) to Panaji/Calangute. Check in to hostel. Visit Fort Aguada (₹50 entry) & watch sunset at Sinquerim beach. Dinner at local eatery (₹200).",
    "Day 2: Morning visit to Chapora Fort (Dil Chahta Hai point, free entry). Relax at Vagator beach. Rent shared scooter for ₹350 with petrol. Sunset at Anjuna beach.",
    "Day 3: Heritage day in Old Goa. Visit Basilica of Bom Jesus (free) & ASI Archaeological Museum (₹25 entry). Walk through Fontainhas Latin Quarter in Panaji.",
    "Day 4: Morning walk at Baga beach. Local lunch (₹180). Take Kadamba bus back to Madgaon station. Board return train to Chennai."
  ],
  "strategic_advice": [
    "Book IRCTC Sleeper berth 60-90 days early to get confirmed ticket for ~₹440 each way.",
    "Always take Kadamba government buses (₹45) from Madgaon station instead of taxis which charge ₹1,200+."
  ]
}}"""

    raw_output = _call_groq_api(prompt, temperature=0.2, max_tokens=4500)
    cleaned = raw_output.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(cleaned)
    except Exception:
        # Fallback if LLM output had stray text
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1:
            parsed = json.loads(cleaned[start_idx : end_idx + 1])
        else:
            raise RuntimeError("AI model did not return a valid JSON structure.")

    items_list = []
    total_allocated = 0.0
    for it in parsed.get("items", []):
        cat = _normalize_category(it.get("category", "General"))
        amt = round(float(it.get("estimated_amount", 0.0)), 2)
        total_allocated += amt
        items_list.append(
            PlanAiItemSuggestion(
                title=it.get("title", "Item"),
                category=cat,
                estimated_amount=amt,
                notes=it.get("notes"),
            )
        )

    contingency = round(float(parsed.get("contingency_buffer", max(0.0, target - total_allocated))), 2)

    return PlanAiSuggestResponse(
        summary=parsed.get("summary", f"AI budget breakdown for {request.name}."),
        contingency_buffer=contingency,
        total_allocated=round(total_allocated, 2),
        items=items_list,
        day_wise_itinerary=parsed.get("day_wise_itinerary", []),
        strategic_advice=parsed.get("strategic_advice", []),
    )


def ask_plan_advisor(db: Session, request: PlanAiAskRequest) -> PlanAiAskResponse:
    plan_context = ""

    if request.plan_id:
        plan = get_plan_details(db, request.plan_id)
        if plan:
            items_summary = [
                f"- {it['title']} ({it['category']}): Est ₹{it['estimated_amount']:,.2f}, Spent: ₹{it['actual_amount']:,.2f} ({'Paid' if it['is_paid'] else 'Pending'})"
                for it in plan.get("items", [])[:15]
            ]
            plan_context = f"""
Current Plan Context:
Plan Name: {plan['name']} ({plan['category_type']})
Target Budget: ₹{plan['target_budget']:,.2f}
Total Estimated: ₹{plan['total_estimated']:,.2f}
Actual Spent: ₹{plan['total_actual']:,.2f}
Remaining Target Buffer: ₹{plan['remaining_target']:,.2f}
Net Variance: ₹{plan['net_variance']:,.2f} ({'Saved' if plan['net_variance'] >= 0 else 'Over'})
Items Status: {plan['paid_items_count']}/{plan['items_count']} paid
Line Items:
{chr(10).join(items_summary) if items_summary else 'No items added yet.'}
"""
    elif request.target_budget or request.event_name:
        plan_context = f"""
Event: {request.event_name or 'General Event'}
Category: {request.category_type or 'General'}
Target Budget: ₹{request.target_budget or 0:,.2f}
"""

    prompt = f"""{plan_context}

User Question: {request.question}

Guidelines:
1. Provide a realistic, highly specific, and actionable answer in Indian Rupees (INR ₹).
2. If the user asks for a trip, itinerary, renovation, or event plan breakdown:
   - Start with a clear title line: e.g. "4-Day Goa Trip – ₹5,000 Budget"
   - Break down each day or phase with a header: e.g. "Day 1 – Arrival & North Beach", "Day 2 – Forts & Heritage", etc.
   - Under each day/phase, list line items in format: "- Category: Specific Name (Train name/number, hotel, entry fee) – ₹Amount"
   - Include a section: "Cost-Cutting Tips" with 2-3 practical tips.
   - End with: "Total Approx. Cost: ₹X,XXX"
3. If the user asks a general advice or budget question:
   - Provide concise, practical advice with bold bullet points, percentages, and actionable tips.
4. CRITICAL: Output ONLY clean formatted text/markdown. DO NOT output a JSON object. DO NOT wrap in {{"answer": ...}}."""

    advisor_sys_prompt = (
        "You are an expert Indian financial advisor and budget planner. "
        "You give highly detailed, concrete cost breakdowns with real train numbers, hotel rates, and entry tickets in Indian Rupees (₹). "
        "Provide your answer directly as clean markdown text. Do NOT wrap output in a JSON object."
    )

    raw_answer = _call_groq_api(
        prompt,
        temperature=0.3,
        max_tokens=2000,
        system_prompt=advisor_sys_prompt,
    )

    answer = raw_answer.strip()
    # Defensively unwrap if the model still produced {"answer": "..."}
    if answer.startswith("{") and answer.endswith("}"):
        try:
            parsed = json.loads(answer)
            if "answer" in parsed and isinstance(parsed["answer"], str):
                answer = parsed["answer"].strip()
        except Exception:
            pass

    return PlanAiAskResponse(answer=answer)
