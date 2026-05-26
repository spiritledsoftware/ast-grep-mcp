import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

describe("createServer", () => {
  it("creates an MCP server", () => {
    expect(createServer()).toBeDefined();
  });

  it("registers the ast-grep tools on the MCP server", () => {
    const server = createServer();
    const registeredTools = Reflect.get(server, "_registeredTools") as Record<string, unknown>;

    expect(Object.keys(registeredTools).sort()).toEqual([
      "ast_grep_scan",
      "ast_grep_search",
      "ast_grep_test",
      "ast_grep_version",
    ]);
  });
});
