import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { resolveWorkspaceRoot, safeRelativePaths } from "../src/pathSafety";

describe("resolveWorkspaceRoot", () => {
  it("defaults to the current working directory", () => {
    const cwd = path.resolve("repo");

    expect(resolveWorkspaceRoot(undefined, cwd)).toBe(cwd);
  });

  it("allows workspace roots inside cwd when provided as relative paths", () => {
    const cwd = path.resolve("repo");

    expect(resolveWorkspaceRoot("project", cwd)).toBe(path.join(cwd, "project"));
  });

  it("rejects workspace roots outside cwd when provided as relative traversal", () => {
    const cwd = path.resolve("repo", "project");

    expect(() => resolveWorkspaceRoot("..", cwd)).toThrow(/outside/);
  });

  it("rejects absolute workspace roots outside cwd", () => {
    const cwd = path.resolve("repo", "project");
    const outside = path.resolve("other-project");

    expect(() => resolveWorkspaceRoot(outside, cwd)).toThrow(/outside/);
  });
});

describe("safeRelativePaths", () => {
  const root = path.resolve("repo", "project");

  it("returns dot when no paths are provided", () => {
    expect(safeRelativePaths(undefined, root)).toEqual(["."]);
  });

  it("returns dot when an empty path list is provided", () => {
    expect(safeRelativePaths([], root)).toEqual(["."]);
  });

  it("allows safe relative paths with platform separators", () => {
    expect(safeRelativePaths(["src", `tests${path.sep}file.ts`], root)).toEqual([
      "src",
      path.join("tests", "file.ts"),
    ]);
  });

  it("normalizes safe relative paths", () => {
    expect(safeRelativePaths(["src/../tests/file.ts"], root)).toEqual([
      path.join("tests", "file.ts"),
    ]);
  });

  it("rejects absolute paths", () => {
    expect(() => safeRelativePaths([path.resolve("tmp", "file.ts")], root)).toThrow(/absolute/);
  });

  it("rejects parent traversal", () => {
    expect(() => safeRelativePaths(["../outside.ts"], root)).toThrow(/outside/);
  });

  it("rejects paths that normalize outside the workspace", () => {
    expect(() => safeRelativePaths(["src/../../outside.ts"], root)).toThrow(/outside/);
  });

  it("rejects empty path entries", () => {
    expect(() => safeRelativePaths([""], root)).toThrow(/empty/);
  });

  it("rejects symlinks that resolve outside the workspace", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ast-grep-mcp-path-"));
    const workspace = path.join(temp, "workspace");
    const outside = path.join(temp, "outside");
    fs.mkdirSync(workspace);
    fs.writeFileSync(outside, "outside");
    fs.symlinkSync(outside, path.join(workspace, "link"));

    expect(() => safeRelativePaths(["link"], workspace)).toThrow(/symlinks/);
  });
});
