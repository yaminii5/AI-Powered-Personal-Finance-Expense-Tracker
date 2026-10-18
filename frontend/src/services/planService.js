import {
  getPlans,
  createPlan,
  getPlanDetails,
  updatePlan,
  deletePlan,
  addPlanItem,
  updatePlanItem,
  deletePlanItem,
} from '../api';

const planService = {
  list: (userId) => getPlans(userId),
  create: (userId, data) => createPlan(userId, data),
  get: (planId) => getPlanDetails(planId),
  update: (planId, data) => updatePlan(planId, data),
  remove: (planId) => deletePlan(planId),
  addItem: (planId, data) => addPlanItem(planId, data),
  updateItem: (itemId, data) => updatePlanItem(itemId, data),
  removeItem: (itemId) => deletePlanItem(itemId),
};

export default planService;

