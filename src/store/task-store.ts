import { randomUUID } from "node:crypto";

import type {
  CreateTaskInput,
  ReplaceTaskInput,
  Task,
  TaskPage,
  TaskPaginationOptions,
} from "../types/task.js";

export class TaskStore {
  private readonly tasks: Task[] = [];

  list(): Task[] {
    return this.tasks.map((task) => ({ ...task }));
  }

  listPage({ page, limit }: TaskPaginationOptions): TaskPage {
    const total = this.tasks.length;
    const totalPages = Math.ceil(total / limit);

    if (page > totalPages) {
      return { items: [], page, limit, total, totalPages };
    }

    const offset = (page - 1) * limit;
    const items = this.tasks.slice(offset, offset + limit).map((task) => ({ ...task }));
    return { items, page, limit, total, totalPages };
  }

  getById(id: string): Task | undefined {
    const task = this.tasks.find((candidate) => candidate.id === id);
    return task ? { ...task } : undefined;
  }

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.push(task);
    return { ...task };
  }

  replace(id: string, input: ReplaceTaskInput): Task | undefined {
    const index = this.tasks.findIndex((task) => task.id === id);
    const existing = this.tasks[index];

    if (!existing) {
      return undefined;
    }

    const updated: Task = {
      id,
      ...input,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.tasks[index] = updated;
    return { ...updated };
  }

  delete(id: string): boolean {
    const index = this.tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      return false;
    }

    this.tasks.splice(index, 1);
    return true;
  }
}