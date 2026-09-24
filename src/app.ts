import express, { type Express } from "express";

import { HttpError } from "./errors/http-error.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { validateBody } from "./middleware/validate.js";
import { TaskStore } from "./store/task-store.js";
import type { CreateTaskInput, ReplaceTaskInput } from "./types/task.js";
import { taskQuerySchema } from "./validation/task-query-schemas.js";
import { createTaskSchema, replaceTaskSchema } from "./validation/task-schemas.js";

export function createApp(store = new TaskStore()): Express {
  const app = express();

  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/tasks", (request, response, next) => {
    const query = request.query;

    if (!Object.hasOwn(query, "page") && !Object.hasOwn(query, "limit")) {
      response.status(200).json(store.list());
      return;
    }

    const result = taskQuerySchema.safeParse(query);

    if (!result.success) {
      next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "Request query validation failed",
          result.error.flatten(),
        ),
      );
      return;
    }

    response.status(200).json(store.listPage(result.data));
  });

  app.get("/tasks/:id", (request, response, next) => {
    const task = store.getById(request.params.id);

    if (!task) {
      next(taskNotFound(request.params.id));
      return;
    }

    response.status(200).json(task);
  });

  app.post("/tasks", validateBody(createTaskSchema), (request, response) => {
    const task = store.create(request.body as CreateTaskInput);
    response.status(201).json(task);
  });

  app.put<{ id: string }>("/tasks/:id", validateBody(replaceTaskSchema), (request, response, next) => {
    const task = store.replace(request.params.id, request.body as ReplaceTaskInput);

    if (!task) {
      next(taskNotFound(request.params.id));
      return;
    }

    response.status(200).json(task);
  });

  app.delete("/tasks/:id", (request, response, next) => {
    if (!store.delete(request.params.id)) {
      next(taskNotFound(request.params.id));
      return;
    }

    response.status(204).send();
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function taskNotFound(id: string): HttpError {
  return new HttpError(404, "TASK_NOT_FOUND", `Task ${id} was not found`);
}