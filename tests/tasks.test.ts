import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { TaskStore } from "../src/store/task-store.js";

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

  it("preserves the route not-found contract", async () => {
    const response = await request(app).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Route GET /missing was not found",
      },
    });
  });
});

describe("GET /tasks pagination", () => {
  let store: TaskStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    store = new TaskStore();
    app = createApp(store);
  });

  function seedTasks(count: number) {
    return Array.from({ length: count }, (_, index) =>
      store.create({ title: `Task ${index}`, description: `Description ${index}`, status: "todo" }),
    );
  }

  it.each(["", "?unrelated=value", "?page[nested]=2&limit[]=1"])(
    "keeps legacy arrays unbounded for /tasks%s",
    async (query) => {
      const tasks = seedTasks(105);
      const response = await request(app).get(`/tasks${query}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(tasks);
    },
  );

  it.each([
    ["?page=1&limit=2", 1, 2, 5, 0, 2],
    ["?page=2&limit=2", 2, 2, 5, 2, 4],
    ["?page=3&limit=2", 3, 2, 5, 4, 5],
    ["?page=4&limit=2", 4, 2, 5, 5, 5],
    ["?page=2&limit=2", 2, 2, 4, 2, 4],
    ["?limit=1", 1, 1, 5, 0, 1],
    ["?limit=100", 1, 100, 105, 0, 100],
    ["?page=2", 2, 20, 25, 20, 25],
    ["?limit=2", 1, 2, 5, 0, 2],
    ["?page=0002&limit=002", 2, 2, 5, 2, 4],
    ["?page=2&limit=2&unrelated=value", 2, 2, 5, 2, 4],
    [`?page=${Number.MAX_SAFE_INTEGER}&limit=100`, Number.MAX_SAFE_INTEGER, 100, 5, 5, 5],
  ] as const)("returns the expected page for %s", async (query, page, limit, count, start, end) => {
    const tasks = seedTasks(count);
    const response = await request(app).get(`/tasks${query}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: tasks.slice(start, end),
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    });
  });

  it.each([1, 2])("returns an empty envelope for page %i of an empty store", async (page) => {
    const response = await request(app).get(`/tasks?page=${page}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [], page, limit: 20, total: 0, totalPages: 0,
    });
  });

  it.each([
    ["page=", "page"],
    ["page=0", "page"],
    ["page=-1", "page"],
    ["page=1.5", "page"],
    ["page=1e1", "page"],
    ["page=%2B1", "page"],
    ["page=%201", "page"],
    ["page=1%0A", "page"],
    ["page=abc", "page"],
    ["page=9007199254740992", "page"],
    ["page=1&page=2", "page"],
    ["page=1&page=1", "page"],
    ["limit=", "limit"],
    ["limit=0", "limit"],
    ["limit=-1", "limit"],
    ["limit=1.5", "limit"],
    ["limit=1e1", "limit"],
    ["limit=%2B1", "limit"],
    ["limit=1%20", "limit"],
    ["limit=1%0A", "limit"],
    ["limit=abc", "limit"],
    ["limit=9007199254740992", "limit"],
    ["limit=101", "limit"],
    ["limit=1&limit=2", "limit"],
    ["limit=1&limit=1", "limit"],
    ["page=&limit=2", "page"],
    ["page=1&limit=", "limit"],
  ])("rejects %s before accessing storage", async (query, field) => {
    const list = vi.spyOn(store, "list");
    const listPage = vi.spyOn(store, "listPage");
    const response = await request(app).get(`/tasks?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request query validation failed",
        details: {
          formErrors: [],
          fieldErrors: { [field]: expect.arrayContaining([expect.any(String)]) },
        },
      },
    });
    expect(list).not.toHaveBeenCalled();
    expect(listPage).not.toHaveBeenCalled();
  });

  it("updates totals and page contents after create and delete", async () => {
    const [first, second] = seedTasks(2);
    if (!first || !second) {
      throw new Error("Expected two seeded tasks");
    }
    const before = await request(app).get("/tasks?limit=2");
    expect(before.status).toBe(200);
    expect(before.body).toEqual({
      items: [first, second], page: 1, limit: 2, total: 2, totalPages: 1,
    });

    const created = await request(app).post("/tasks").send({ title: "New" });
    expect(created.status).toBe(201);
    const afterCreate = await request(app).get("/tasks?page=2&limit=2");
    expect(afterCreate.status).toBe(200);
    expect(afterCreate.body).toEqual({
      items: [created.body], page: 2, limit: 2, total: 3, totalPages: 2,
    });

    const deleted = await request(app).delete(`/tasks/${first.id}`);
    expect(deleted.status).toBe(204);
    const afterDelete = await request(app).get("/tasks?limit=2");
    expect(afterDelete.status).toBe(200);
    expect(afterDelete.body).toEqual({
      items: [second, created.body], page: 1, limit: 2, total: 2, totalPages: 1,
    });
  });
});