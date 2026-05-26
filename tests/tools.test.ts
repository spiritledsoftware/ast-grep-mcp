import { describe, expect, it, vi } from "vitest";
import { buildScanArgs, buildSearchArgs, createAstGrepTools } from "../src/tools.js";
import type { CommandResult } from "../src/runner.js";

const binary = { path: "/bin/ast-grep", source: "path" as const, version: "ast-grep 1.0.0" };

function commandResult(args: string[], stdout = ""): CommandResult {
  return {
    command: binary.path,
    args,
    exitCode: 0,
    stdout,
    stderr: "",
    timedOut: false,
    truncated: false,
  };
}

describe("buildSearchArgs", () => {
  it("builds a search command with JSON stream output and safe paths", () => {
    expect(buildSearchArgs({ pattern: "$A", paths: ["src"] }, process.cwd())).toEqual([
      "run",
      "--pattern",
      "$A",
      "--json=stream",
      "src",
    ]);
  });

  it("omits update-all for rewrite preview", () => {
    expect(
      buildSearchArgs({ pattern: "$A", rewrite: "$A", apply: false }, process.cwd()),
    ).not.toContain("--update-all");
  });

  it("includes update-all for rewrite apply", () => {
    expect(buildSearchArgs({ pattern: "$A", rewrite: "$A", apply: true }, process.cwd())).toContain(
      "--update-all",
    );
  });
});

describe("buildScanArgs", () => {
  it("supports config, rule, inline rules, filter, metadata, and apply", () => {
    expect(
      buildScanArgs(
        {
          config: "sgconfig.yml",
          rule: "rules/no-var.yml",
          inlineRules: "id: inline",
          filter: "no-var",
          includeMetadata: true,
          apply: true,
          paths: ["src"],
        },
        process.cwd(),
      ),
    ).toEqual([
      "scan",
      "--json=stream",
      "--config",
      "sgconfig.yml",
      "--rule",
      "rules/no-var.yml",
      "--inline-rules",
      "id: inline",
      "--filter",
      "no-var",
      "--include-metadata",
      "--update-all",
      "src",
    ]);
  });
});

describe("createAstGrepTools", () => {
  it("requires apply when rewrite is provided", async () => {
    const tools = createAstGrepTools({ resolveBinary: async () => binary });
    const result = await tools.search({ pattern: "$A", rewrite: "$A" });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({ code: "ast_grep_search_failed" });
  });

  it("runs search and parses JSON output", async () => {
    const run = vi.fn(async (_command: string, args: string[]) =>
      commandResult(args, '{"file":"src/a.ts","text":"foo"}\n'),
    );
    const tools = createAstGrepTools({ resolveBinary: async () => binary, runCommand: run });

    const result = await tools.search({ pattern: "foo", paths: ["src"] });

    expect(result.isError).toBeUndefined();
    expect(run).toHaveBeenCalledWith(
      binary.path,
      ["run", "--pattern", "foo", "--json=stream", "src"],
      expect.anything(),
    );
    expect(result.structuredContent).toMatchObject({
      matches: [{ file: "src/a.ts", text: "foo" }],
    });
  });

  it("rejects absolute paths before command execution", async () => {
    const run = vi.fn();
    const tools = createAstGrepTools({ resolveBinary: async () => binary, runCommand: run });
    const result = await tools.search({ pattern: "foo", paths: ["/tmp/file.ts"] });
    expect(result.isError).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it("builds ast-grep test commands", async () => {
    const run = vi.fn(async (_command: string, args: string[]) => commandResult(args, "ok"));
    const tools = createAstGrepTools({ resolveBinary: async () => binary, runCommand: run });
    await tools.test({ paths: ["rules"] });
    expect(run).toHaveBeenCalledWith(binary.path, ["test", "rules"], expect.anything());
  });

  it("rejects scan rewrite because ast-grep scan uses rule fixes instead", async () => {
    const tools = createAstGrepTools({ resolveBinary: async () => binary });
    const result = await tools.scan({ inlineRules: "id: x", rewrite: "$A", apply: false });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({ code: "ast_grep_scan_failed" });
  });
});
