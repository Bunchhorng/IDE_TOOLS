export interface User {
  id: number;
  name: string;
  email: string | null;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  files?: File[];
}

export interface File {
  id: number;
  project_id: number;
  folder_id: number | null;
  filename: string;
  language: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Language {
  id: number;
  name: string;
  slug: string;
  version: string;
  docker_image: string;
  compile_command: string | null;
  run_command: string;
  filename_template: string | null;
  is_active: boolean;
}

export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'memory_limit'
  | 'system_error'
  | 'failed';

export interface Execution {
  id: number;
  user_id: number;
  project_id: number;
  file_id: number;
  language_id: number;
  status: ExecutionStatus;
  interactive?: boolean;
  /** Interactive-only: true once the sandbox has exited. */
  interactive_finished?: boolean | null;
  source_code: string;
  stdin: string | null;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  execution_time: number | null;
  memory_usage: number | null;
  created_at: string;
  updated_at: string;
  filename?: string | null;
  language?: Language;
}

export interface ExecuteRequest {
  language: string;
  project_id: number;
  file_id: number;
  code: string;
  stdin?: string;
  interactive?: boolean;
}

export interface InteractiveInputRequest {
  line?: string;
  close?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AuthTokens {
  token: string;
}
