import { beforeEach, describe, expect, it } from "vitest";

import { TaskStore } from "../src/store/task-store.js";

describe("TaskStore pagination", () => {
  let store: TaskStore;

  beforeEach(() => {
    store = new TaskStore();
  });

  it("returns zero pages for an empty store", () => {
    expect(store.listPage({ page: 1, limit: 20 })).toEqual({
      items: [], page: 1, limit: 20, total: 0, totalPages: 0,
    });
  });

  it("preserves insertion order without gaps or overlapping pages", () => {
    const tasks = Array.from({ length: 5 }, (_, index) =>
      store.create({ title: `Task ${index}`, description: "", status: "todo" }),
    );
    const pages = [1, 2, 3].map((page) => store.listPage({ page, limit: 2 }));

    expect(pages.flatMap((page) => page.items)).toEqual(tasks);
    expect(pages.map(({ total, totalPages }) => ({ total, totalPages }))).toEqual(
      Array.from({ length: 3 }, () => ({ total: 5, totalPages: 3 })),
    );
    expect(store.list()).toEqual(tasks);
  });

  it("returns empty items for huge pages without overflowing offsets", () => {
    store.create({ title: "Task", description: "", status: "todo" });

    expect(store.listPage({ page: Number.MAX_SAFE_INTEGER, limit: 100 })).toEqual({
      items: [], page: Number.MAX_SAFE_INTEGER, limit: 100, total: 1, totalPages: 1,
    });
  });

  it("returns defensive copies of tasks and arrays", () => {
    const task = store.create({ title: "Original", description: "", status: "todo" });
    const result = store.listPage({ page: 1, limit: 20 });
    const returnedTask = result.items.at(0);

    expect(returnedTask).toEqual(task);
    if (!returnedTask) {
      throw new Error("Expected a paginated task");
    }
    returnedTask.title = "Changed";
    result.items.length = 0;

    expect(store.getById(task.id)).toEqual(task);
    expect(store.list()).toEqual([task]);
    expect(store.listPage({ page: 1, limit: 20 }).items).toEqual([task]);
  });
});
