import { getBudgets, addBudget, updateBudget, deleteBudget } from '../api';

const budgetService = {
  list: (userId) => getBudgets(userId),
  add: (userId, data) => addBudget({ ...data, user_id: userId, limit_amount: parseFloat(data.limit_amount) }),
  update: (id, limitAmount) => updateBudget(id, { limit_amount: parseFloat(limitAmount) }),
  remove: (id) => deleteBudget(id),
};

export default budgetService;

