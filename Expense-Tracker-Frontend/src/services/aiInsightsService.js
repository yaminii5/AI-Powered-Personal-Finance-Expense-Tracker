import { getTransactions, getSummary, getUser } from '../api';

const GROK_API = 'https://api.groq.com/openai/v1/chat/completions';
const GROK_KEY = process.env.REACT_APP_GROQ_API_KEY;

export async function fetchAIInsights(userId, username, month, year) {
  // Fetch all data in parallel
  const [transactions, summary, user] = await Promise.all([
    getTransactions(userId),           // all-time for pattern detection
    getSummary(userId, month, year),   // current month summary
    getUser(username),
  ]);

  const txList = Array.isArray(transactions) ? transactions : (transactions?.transactions || []);

  // Build a compact data payload for the AI
  const currentMonthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  const prompt = `You are a personal finance analyst. Analyze this user's expense data and return ONLY a JSON array of insight objects.

User: ${user.first_name || username}
Current Balance: ₹${user.current_balance}
Month being analyzed: ${currentMonthName} ${year}

Monthly Summary:
- Income by category: ${JSON.stringify(summary?.income || {})}
- Expenses by category: ${JSON.stringify(summary?.expense || {})}

Recent transactions (last 30): ${JSON.stringify(
    txList.slice(-30).map(t => ({
      type: t.type,
      category: t.category,
      amount: t.amount,
      date: t.date,
      description: t.description,
    }))
  )}

Return ONLY a valid JSON array (no markdown, no explanation) with 3-5 insight objects. Each object must have:
- "type": one of "warning", "tip", "pattern", "positive"
- "title": short title (max 6 words)
- "message": specific insight with actual numbers from the data (max 20 words)

Example format:
[{"type":"warning","title":"High Food Spending","message":"You spent ₹4200 on food this month, 35% above your usual average."}]`;

  const res = await fetch(GROK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROK_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error('Grok raw error:', JSON.stringify(errBody));
    throw new Error(`Grok API error ${res.status}: ${errBody?.error?.message || errBody?.message || res.statusText}`);
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content || '[]';

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
