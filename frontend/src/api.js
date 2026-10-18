const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg =
      (typeof data.detail === 'string' ? data.detail : null) ||
      (Array.isArray(data.detail) ? data.detail.map((e) => e.msg).join(', ') : null) ||
      data.message ||
      data.error ||
      'Request failed';
    throw new Error(errorMsg);
  }
  return data;
};

export const getUser = (username) => req('GET', `/users/${encodeURIComponent(username)}`);
export const loginUser = (body) => req('POST', '/users/login', body);
export const createUser = (body) => req('POST', '/users', body);
export const updateUser = (username, body) => req('PUT', `/users/${encodeURIComponent(username)}`, body);
export const deleteUser = (username) => req('DELETE', `/users/${encodeURIComponent(username)}`);

export const getTransactions = (userId, month, year, limit, offset) => {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (year) params.append('year', year);
  if (limit) params.append('limit', limit);
  if (offset !== undefined && offset !== null) params.append('offset', offset);
  const q = params.toString() ? `?${params.toString()}` : '';
  return req('GET', `/transactions/${userId}${q}`);
};
export const getSummary = (userId, month, year) =>
  req('GET', `/transactions/${userId}/summary?month=${month}&year=${year}`);
export const addTransaction = (body) => req('POST', '/transactions', body);
export const editTransaction = (id, body) => req('PUT', `/transactions/${id}/edit`, body);
export const deleteTransaction = (id) => req('DELETE', `/transactions/${id}/delete`);

export const getBudgets = (userId) => req('GET', `/budgets/${userId}`);
export const addBudget = (body) => req('POST', '/budgets', body);
export const updateBudget = (id, body) => req('PUT', `/budgets/${id}/update`, body);
export const deleteBudget = (id) => req('DELETE', `/budgets/${id}/delete`);

export const getAnalysis = (userId, month, year) =>
  req('GET', `/analysis/${userId}?month=${month}&year=${year}`);

export const getAIInsights = (userId, month, year) =>
  req('GET', `/insights/${userId}?month=${month}&year=${year}`);

