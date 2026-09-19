import api from './api';
import type { File, ApiResponse } from '../types';

interface CreateFileData {
  filename: string;
  language: string;
  content?: string;
  folder_id?: number | null;
}

interface UpdateFileData {
  filename?: string;
  language?: string;
  content?: string;
  folder_id?: number | null;
}

export const fileService = {
  async getByProject(projectSlug: string): Promise<ApiResponse<File[]>> {
    const response = await api.get(`/projects/${projectSlug}/files`);
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<File>> {
    const response = await api.get(`/files/${id}`);
    return response.data;
  },

  async create(projectSlug: string, data: CreateFileData): Promise<ApiResponse<File>> {
    const response = await api.post(`/projects/${projectSlug}/files`, data);
    return response.data;
  },

  async update(id: number, data: UpdateFileData): Promise<ApiResponse<File>> {
    const response = await api.put(`/files/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete(`/files/${id}`);
    return response.data;
  },
};
