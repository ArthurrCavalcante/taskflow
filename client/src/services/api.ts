import type { User, Board, Task } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('taskflow_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Something went wrong';
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // response body is not JSON
    }
    throw new ApiError(message, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Auth ──

export async function login(email: string, password: string) {
  return request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(name: string, email: string, password: string) {
  return request<{ token: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function getMe() {
  return request<{ user: User }>('/auth/me');
}

// ── Boards ──

export async function getBoards() {
  return request<{ boards: Board[] }>('/boards');
}

export async function createBoard(title: string) {
  return request<{ board: Board }>('/boards', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function getBoard(id: number) {
  return request<{ board: Board }>(`/boards/${id}`);
}

export async function updateBoard(id: number, title: string) {
  return request<{ board: Board }>(`/boards/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

export async function deleteBoard(id: number) {
  return request<void>(`/boards/${id}`, {
    method: 'DELETE',
  });
}

// ── Tasks ──

export async function createTask(data: {
  title: string;
  description: string;
  status: string;
  priority: string;
  boardId: number;
}) {
  return request<{ task: Task }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  id: number,
  data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'order'>>
) {
  return request<{ task: Task }>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: number) {
  return request<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function reorderTasks(
  tasks: Array<{ id: number; status: string; order: number }>
) {
  return request<void>('/tasks/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ tasks }),
  });
}
