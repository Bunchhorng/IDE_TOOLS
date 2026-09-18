import api from './api';
import type { ApiResponse, UsageStats } from '../types';

export const statsService = {
  async overview(): Promise<ApiResponse<UsageStats>> {
    const response = await api.get('/stats/overview');
    return response.data;
  },
};
