import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("task API", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("reports health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns an empty task list", async () => {
    const response = await request(app).get("/tasks");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("supports the CRUD success contracts", async () => {
    const createResponse = await request(app).post("/tasks").send({
      title: "Write baseline tests",
      description: "Cover every success status",
      status: "todo",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      title: "Write baseline tests",
      description: "Cover every success status",
      status: "todo",
    });

    const taskId = createResponse.body.id as string;
    const getResponse = await request(app).get(`/tasks/${taskId}`);
    expect(getResponse.status).toBe(200);

    const updateResponse = await request(app).put(`/tasks/${taskId}`).send({
      title: "Write baseline tests",
      description: "CRUD contracts covered",
      status: "done",
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.status).toBe("done");

    const deleteResponse = await request(app).delete(`/tasks/${taskId}`);
    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.text).toBe("");
  });

  it.each(["get", "put", "delete"] as const)("returns 404 for missing task on %s", async (method) => {
    const call = request(app)[method]("/tasks/missing");
    const response = method === "put"
      ? await call.send({ title: "Missing", description: "", status: "todo" })
      : await call;

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "TASK_NOT_FOUND",
        message: "Task missing was not found",
      },
    });
  });

  it("returns a consistent validation error", async () => {
    const response = await request(app).post("/tasks").send({ title: "", status: "blocked" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request body validation failed",
    });
  });
});