import { describe, expect, it } from "vitest";

import { taskQuerySchema } from "../src/validation/task-query-schemas.js";

describe("task query schema", () => {
  it.each([
    [{}, { page: 1, limit: 20 }],
    [{ page: "2" }, { page: 2, limit: 20 }],
    [{ limit: "100" }, { page: 1, limit: 100 }],
    [{ page: "0002", limit: "001" }, { page: 2, limit: 1 }],
    [{ page: String(Number.MAX_SAFE_INTEGER) }, { page: Number.MAX_SAFE_INTEGER, limit: 20 }],
    [{ page: "1", unrelated: "ignored" }, { page: 1, limit: 20 }],
  ])("parses %j", (input, expected) => {
    expect(taskQuerySchema.parse(input)).toEqual(expected);
  });

  describe.each(["page", "limit"])("%s validation", (key) => {
    it.each([
      "",
      " ",
      " 1",
      "1 ",
      "1\n",
      "1\r",
      "1\t",
      "+1",
      "-1",
      "0",
      "00",
      "1.0",
      "1.5",
      "1e1",
      "0x10",
      "NaN",
      "Infinity",
      "abc",
      "1abc",
      "１２",
      "9007199254740992",
      "9".repeat(400),
      ["1", "2"],
      { value: "1" },
      null,
      1,
      true,
    ])("rejects %j", (value) => {
      const result = taskQuerySchema.safeParse({ [key]: value });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ path: [key] })]),
        );
      }
    });
  });

  it("rejects limits over 100", () => {
    expect(taskQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});
