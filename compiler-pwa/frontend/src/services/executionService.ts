import api from './api';
import type { Execution, ExecuteRequest, InteractiveInputRequest, InteractiveSignalRequest, ApiResponse } from '../types';

export const executionService = {
  async execute(data: ExecuteRequest): Promise<ApiResponse<Execution>> {
    const response = await api.post('/execute', data);
    return response.data;
  },

  async startInteractive(id: number): Promise<ApiResponse<Execution>> {
    const response = await api.post(`/executions/${id}/interactive/start`);
    return response.data;
  },

  async sendInteractiveInput(id: number, data: InteractiveInputRequest): Promise<ApiResponse<Execution>> {
    const response = await api.post(`/executions/${id}/interactive/input`, data);
    return response.data;
  },

  async sendInteractiveSignal(id: number, data: InteractiveSignalRequest): Promise<ApiResponse<Execution>> {
    const response = await api.post(`/executions/${id}/interactive/signal`, data);
    return response.data;
  },

  async pollInteractive(id: number): Promise<ApiResponse<Execution>> {
    const response = await api.get(`/executions/${id}/interactive`);
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Execution>> {
    const response = await api.get(`/executions/${id}`);
    return response.data;
  },

  async getAll(page = 1): Promise<ApiResponse<{ data: Execution[]; current_page: number; last_page: number; per_page: number; total: number }>> {
    const response = await api.get(`/executions?page=${page}`);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete(`/executions/${id}`);
    return response.data;
  },

  async deleteAll(): Promise<ApiResponse<{ deleted: number }>> {
    const response = await api.delete('/executions');
    return response.data;
  },

  async pollStatus(id: number, maxAttempts = 200): Promise<Execution> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await this.getById(id);
      const execution = response.data;
      if (execution.status !== 'queued' && execution.status !== 'running') {
        return execution;
      }
      // Adaptive backoff: a queued job cannot start sooner no matter how
      // fast we poll — during a classroom spike (everyone clicks Run at
      // once) polling slowly while queued cuts API load ~3x with no UX
      // cost. Once running, poll fast so results feel instant.
      const delay = execution.status === 'queued' ? 1500 : 400;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error('Execution polling timeout');
  },
};
