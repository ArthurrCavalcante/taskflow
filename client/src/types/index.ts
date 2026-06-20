export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Board {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
  tasks?: Task[];
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  order: number;
  boardId: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
