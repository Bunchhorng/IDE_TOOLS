import api from './api';
import type { Language, ApiResponse } from '../types';

export const languageService = {
  async getAll(): Promise<ApiResponse<Language[]>> {
    const response = await api.get('/languages');
    return response.data;
  },
};
