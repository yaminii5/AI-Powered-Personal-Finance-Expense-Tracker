import { getTransactions, getSummary, addTransaction, editTransaction, deleteTransaction } from '../api';

const transactionService = {
  list: (userId, month, year) => getTransactions(userId, month || undefined, year || undefined),
  summary: (userId, month, year) => getSummary(userId, month, year),
  add: (userId, data) => addTransaction({ ...data, user_id: userId, amount: parseFloat(data.amount) }),
  edit: (id, data) => editTransaction(id, { ...data, amount: parseFloat(data.amount) }),
  remove: (id) => deleteTransaction(id),
};

export default transactionService;

