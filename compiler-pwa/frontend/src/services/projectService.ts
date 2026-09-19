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

  async getBySlug(slug: string): Promise<ApiResponse<Project>> {
    const response = await api.get(`/projects/${slug}`);
    return response.data;
  },

  async create(data: CreateProjectData): Promise<ApiResponse<Project>> {
    const response = await api.post('/projects', data);
    return response.data;
  },

  async update(slug: string, data: Partial<CreateProjectData>): Promise<ApiResponse<Project>> {
    const response = await api.put(`/projects/${slug}`, data);
    return response.data;
  },

  async delete(slug: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`/projects/${slug}`);
    return response.data;
  },
};