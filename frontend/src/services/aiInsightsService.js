import { getAIInsights } from '../api';

export async function fetchAIInsights(userId, username, month, year) {
  try {
    const insights = await getAIInsights(userId, month, year);
    return Array.isArray(insights) ? insights : [];
  } catch (err) {
    console.error('Failed to fetch AI insights from backend:', err);
    throw err;
  }
}
