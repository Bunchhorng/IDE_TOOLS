import api from './api';
import type { Folder, ApiResponse } from '../types';

interface CreateFolderData {
  name: string;
  parent_id?: number | null;
}

interface UpdateFolderData {
  name?: string;
  parent_id?: number | null;
}

export const folderService = {
  async getByProject(projectSlug: string): Promise<ApiResponse<Folder[]>> {
    const response = await api.get(`/projects/${projectSlug}/folders`);
    return response.data;
  },

  async create(projectSlug: string, data: CreateFolderData): Promise<ApiResponse<Folder>> {
    const response = await api.post(`/projects/${projectSlug}/folders`, data);
    return response.data;
  },

  async update(id: number, data: UpdateFolderData): Promise<ApiResponse<Folder>> {
    const response = await api.put(`/folders/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete(`/folders/${id}`);
    return response.data;
  },
};