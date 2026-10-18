import { getAnalysis } from '../api';

const analysisService = {
  get: (userId, month, year) => getAnalysis(userId, month, year),
};

export default analysisService;

