// for render
const BASE = 'https://expense-tracker-backend-qog9.onrender.com/api';

// //for localhost
// const BASE = 'http://localhost:5000/api';

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
};

export const getUser = (username) => req('GET', `/users/${username}`);
export const createUser = (body) => req('POST', '/users', body);
export const updateUser = (username, body) => req('PUT', `/users/${username}`, body);
export const deleteUser = (username) => req('DELETE', `/users/${username}`);

export const getTransactions = (userId, month, year) => {
  const q = month && year ? `?month=${month}&year=${year}` : '';
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
