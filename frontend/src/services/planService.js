import {
  getPlans,
  createPlan,
  getPlanDetails,
  updatePlan,
  deletePlan,
  addPlanItem,
  bulkAddPlanItems,
  updatePlanItem,
  deletePlanItem,
  getAiPlanSuggestion,
  askAiPlanAdvisor,
} from '../api';

const planService = {
  list: (userId) => getPlans(userId),
  create: (userId, data) => createPlan(userId, data),
  get: (planId) => getPlanDetails(planId),
  update: (planId, data) => updatePlan(planId, data),
  remove: (planId) => deletePlan(planId),
  addItem: (planId, data) => addPlanItem(planId, data),
  bulkAddItems: (planId, items) => bulkAddPlanItems(planId, items),
  updateItem: (itemId, data) => updatePlanItem(itemId, data),
  removeItem: (itemId) => deletePlanItem(itemId),
  getAiSuggestion: (data) => getAiPlanSuggestion(data),
  askAiAdvisor: (data) => askAiPlanAdvisor(data),
};

export default planService;


