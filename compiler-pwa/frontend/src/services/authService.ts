import api from './api';
import type { User, ApiResponse } from '../types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

function getDeviceId(): string {
  const key = 'coderunner_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export const authService = {
  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async guest(): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await api.post('/auth/guest', { device_id: getDeviceId() });
    return response.data;
  },

  async upgradeGuest(
    data: RegisterData,
  ): Promise<ApiResponse<{ user: User }>> {
    const response = await api.post('/auth/upgrade', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async me(): Promise<ApiResponse<User>> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  clearToken(): void {
    localStorage.removeItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },

  getDeviceId,
};
