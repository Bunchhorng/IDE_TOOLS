import api from './api';
import type { Project, ApiResponse, PaginatedResponse } from '../types';

interface CreateProjectData {
  name: string;
  description?: string;
}

export const projectService = {
  async getAll(page = 1): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const response = await api.get(`/projects?page=${page}`);
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Project>> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async create(data: CreateProjectData): Promise<ApiResponse<Project>> {
    const response = await api.post('/projects', data);
    return response.data;
  },

  async update(id: number, data: Partial<CreateProjectData>): Promise<ApiResponse<Project>> {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};
