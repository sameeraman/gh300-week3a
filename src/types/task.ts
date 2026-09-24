export const taskStatuses = ["todo", "in-progress", "done"] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
}

export type ReplaceTaskInput = CreateTaskInput;

export interface TaskPaginationOptions {
  page: number;
  limit: number;
}

export interface TaskPage extends TaskPaginationOptions {
  items: Task[];
  total: number;
  totalPages: number;
}