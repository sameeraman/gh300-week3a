import { z } from "zod";

import { taskStatuses } from "../types/task.js";

const taskFields = {
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2_000),
  status: z.enum(taskStatuses),
};

export const createTaskSchema = z
  .object({
    title: taskFields.title,
    description: taskFields.description.default(""),
    status: taskFields.status.default("todo"),
  })
  .strict();

export const replaceTaskSchema = z.object(taskFields).strict();