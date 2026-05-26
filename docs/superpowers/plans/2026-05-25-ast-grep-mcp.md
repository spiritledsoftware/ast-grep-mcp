# AST Grep MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript stdio MCP server that exposes safe, structured ast-grep CLI search, scan, test, version, and gated rewrite apply capabilities to agents.

**Architecture:** The server wraps the real ast-grep CLI via subprocess argv arrays and exposes a small MCP tool surface over stdio. Binary resolution prefers explicit and system binaries, then falls back to the project dependency `@ast-grep/cli`, which downloads the platform binary at install time. Path safety, argv construction, result parsing, and apply gating are isolated into focused modules with unit tests.

**Tech Stack:** Node.js ESM, TypeScript, `@modelcontextprotocol/sdk`, `zod`, `vitest`, `tsx`, `@ast-grep/cli`.

---

## File Structure

- Create `package.json`: package metadata, bin entry, dependencies, scripts.
- Create `tsconfig.json`: strict TypeScript ESM compilation settings.
- Create `src/index.ts`: stdio entry point and process-level error handling.
- Create `src/server.ts`: MCP server creation and tool registration.
- Create `src/schemas.ts`: Zod schemas and TypeScript input types for all tools.
- Create `src/pathSafety.ts`: workspace-root resolution and relative path validation.
- Create `src/binary.ts`: ast-grep binary resolution from env, PATH, verified `sg`, and local package fallback.
- Create `src/runner.ts`: subprocess execution with timeout and bounded output.
- Create `src/results.ts`: JSON output parsing and compact structured response helpers.
- Create `src/tools.ts`: tool handlers and ast-grep argv construction.
- Create `tests/pathSafety.test.ts`: path traversal and normalization coverage.
- Create `tests/binary.test.ts`: binary resolution behavior with injected command runners.
- Create `tests/runner.test.ts`: timeout and output limit behavior.
- Create `tests/results.test.ts`: JSON stream/array parsing behavior.
- Create `tests/tools.test.ts`: argv construction, apply gating, and no-write preview behavior.
- Create `tests/integration.test.ts`: temp workspace integration for search, preview rewrite, apply rewrite, and version.
- Create `README.md`: installation, MCP configuration, tools, safety model, and examples.

---

### Task 1: Project Scaffold

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `src/server.ts`
- Create: `src/schemas.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Create package and TypeScript config**

Create `package.json` with this content:

```json
{
  "name": "ast-grep-mcp",
  "version": "0.1.0",
  "description": "MCP stdio server exposing ast-grep to agents",
  "type": "module",
  "bin": {
    "ast-grep-mcp": "dist/index.js"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@ast-grep/cli": "^0.42.1",
    "@modelcontextprotocol/sdk": "^1.12.1",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Create `tsconfig.json` with this content:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 2: Add minimal server entry and schemas**

Create `src/schemas.ts` exporting placeholder schemas for initial compile:

```ts
import { z } from "zod";

export const versionInputSchema = z.object({});
export type VersionInput = z.infer<typeof versionInputSchema>;
```

Create `src/server.ts` with a minimal MCP server:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { versionInputSchema } from "./schemas";

export function createServer(): McpServer {
  const server = new McpServer({ name: "ast-grep-mcp", version: "0.1.0" });

  server.tool(
    "ast_grep_version",
    "Report the ast-grep binary version and resolved path.",
    versionInputSchema.shape,
    async () => ({
      content: [{ type: "text", text: JSON.stringify({ version: "unimplemented" }) }],
      structuredContent: { version: "unimplemented" },
    }),
  );

  return server;
}
```

Create `src/index.ts` with stdio transport:

```ts
#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { createServer } from "./server";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
```

- [ ] **Step 3: Add smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createServer } from "../src/server";

describe("createServer", () => {
  it("creates an MCP server", () => {
    expect(createServer()).toBeDefined();
  });
});
```

- [ ] **Step 4: Install dependencies and verify scaffold**

Run: `npm install`

Run: `npm test`

Expected: Vitest passes the smoke test.

Run: `npm run typecheck`

Expected: TypeScript reports no errors.

---

### Task 2: Path Safety

**Files:**

- Create: `src/pathSafety.ts`
- Create: `tests/pathSafety.test.ts`

- [ ] **Step 1: Write path safety tests**

Create `tests/pathSafety.test.ts`:

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveWorkspaceRoot, safeRelativePaths } from "../src/pathSafety";

describe("resolveWorkspaceRoot", () => {
  it("defaults to the current working directory", () => {
    expect(resolveWorkspaceRoot(undefined, "/repo")).toBe(path.resolve("/repo"));
  });

  it("rejects workspace roots outside cwd when provided as relative traversal", () => {
    expect(() => resolveWorkspaceRoot("..", "/repo/project")).toThrow(/outside/);
  });
});

describe("safeRelativePaths", () => {
  const root = path.resolve("/repo/project");

  it("returns dot when no paths are provided", () => {
    expect(safeRelativePaths(undefined, root)).toEqual(["."]);
  });

  it("allows safe relative paths", () => {
    expect(safeRelativePaths(["src", "tests/file.ts"], root)).toEqual(["src", "tests/file.ts"]);
  });

  it("rejects absolute paths", () => {
    expect(() => safeRelativePaths(["/tmp/file.ts"], root)).toThrow(/absolute/);
  });

  it("rejects parent traversal", () => {
    expect(() => safeRelativePaths(["../outside.ts"], root)).toThrow(/outside/);
  });

  it("rejects paths that normalize outside the workspace", () => {
    expect(() => safeRelativePaths(["src/../../outside.ts"], root)).toThrow(/outside/);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/pathSafety.test.ts`

Expected: FAIL because `src/pathSafety.ts` does not exist.

- [ ] **Step 3: Implement path safety**

Create `src/pathSafety.ts`:

```ts
import path from "node:path";

export function resolveWorkspaceRoot(input: string | undefined, cwd = process.cwd()): string {
  const base = path.resolve(cwd);
  const root = input ? path.resolve(base, input) : base;
  assertInside(root, base, "workspace root");
  return root;
}

export function safeRelativePaths(paths: string[] | undefined, workspaceRoot: string): string[] {
  if (!paths || paths.length === 0) {
    return ["."];
  }

  return paths.map((rawPath) => {
    if (path.isAbsolute(rawPath)) {
      throw new Error(`Path must be workspace-relative, got absolute path: ${rawPath}`);
    }

    const normalized = path.normalize(rawPath);
    const resolved = path.resolve(workspaceRoot, normalized);
    assertInside(resolved, workspaceRoot, rawPath);

    return normalized === "" ? "." : normalized;
  });
}

export function safeRelativePath(pathInput: string, workspaceRoot: string): string {
  return safeRelativePaths([pathInput], workspaceRoot)[0];
}

function assertInside(candidate: string, root: string, label: string): void {
  const relative = path.relative(root, candidate);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }
  throw new Error(`${label} resolves outside the workspace`);
}
```

- [ ] **Step 4: Verify path safety**

Run: `npm test -- tests/pathSafety.test.ts`

Expected: PASS.

---

### Task 3: Binary Resolution

**Files:**

- Create: `src/binary.ts`
- Create: `tests/binary.test.ts`

- [ ] **Step 1: Write binary resolution tests**

Create `tests/binary.test.ts` with injected filesystem and command helpers covering env override, PATH `ast-grep`, verified `sg`, rejected non-ast-grep `sg`, and local fallback.

- [ ] **Step 2: Implement binary resolution**

Create `src/binary.ts` with:

```ts
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

export interface ResolvedBinary {
  path: string;
  source: "env" | "path" | "sg" | "local-package";
}

export async function resolveAstGrepBinary(env = process.env): Promise<ResolvedBinary> {
  if (env.AST_GREP_BIN) {
    await assertExecutable(env.AST_GREP_BIN);
    return { path: env.AST_GREP_BIN, source: "env" };
  }

  const astGrep = await findOnPath("ast-grep", env.PATH);
  if (astGrep) {
    return { path: astGrep, source: "path" };
  }

  const sg = await findOnPath("sg", env.PATH);
  if (sg && (await isAstGrep(sg))) {
    return { path: sg, source: "sg" };
  }

  const local = await resolveLocalPackageBinary();
  return { path: local, source: "local-package" };
}

export async function getAstGrepVersion(binaryPath: string): Promise<string> {
  const result = await runVersion(binaryPath);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to run ast-grep --version: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function resolveLocalPackageBinary(): Promise<string> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const candidates = [
    path.join(
      projectRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "ast-grep.cmd" : "ast-grep",
    ),
    path.join(
      projectRoot,
      "..",
      "node_modules",
      ".bin",
      process.platform === "win32" ? "ast-grep.cmd" : "ast-grep",
    ),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find ast-grep. Install ast-grep or run npm install to fetch @ast-grep/cli.",
  );
}

async function findOnPath(command: string, pathValue: string | undefined): Promise<string | null> {
  for (const segment of (pathValue ?? "").split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(segment, process.platform === "win32" ? `${command}.cmd` : command);
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function isAstGrep(binaryPath: string): Promise<boolean> {
  const result = await runVersion(binaryPath);
  return result.exitCode === 0 && /ast-grep/i.test(result.stdout + result.stderr);
}

async function assertExecutable(binaryPath: string): Promise<void> {
  if (!(await exists(binaryPath))) {
    throw new Error(`AST_GREP_BIN does not exist: ${binaryPath}`);
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runVersion(
  binaryPath: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(binaryPath, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => resolve({ exitCode: 1, stdout, stderr: error.message }));
    child.on("close", (exitCode) => resolve({ exitCode: exitCode ?? 1, stdout, stderr }));
  });
}
```

- [ ] **Step 3: Verify binary tests**

Run: `npm test -- tests/binary.test.ts`

Expected: PASS.

---

### Task 4: Runner And Result Parsing

**Files:**

- Create: `src/runner.ts`
- Create: `src/results.ts`
- Create: `tests/runner.test.ts`
- Create: `tests/results.test.ts`

- [ ] **Step 1: Add tests for subprocess bounds and JSON parsing**

Tests must verify successful stdout capture, non-zero exit diagnostics, timeout failure, stdout/stderr truncation, JSON array parsing, JSON stream parsing, empty output parsing, and malformed JSON error messages.

- [ ] **Step 2: Implement runner**

Create `src/runner.ts` with `runCommand(command, args, { cwd, timeoutMs, maxOutputBytes })` using `spawn(command, args, { shell: false })`, a timer that kills the child on timeout, and bounded stdout/stderr buffers.

- [ ] **Step 3: Implement result parsing**

Create `src/results.ts` with `parseJsonOutput(stdout)` that supports `[]`, compact arrays, pretty arrays, and newline-delimited JSON objects. Add `toStructuredToolResult(output)` returning both text JSON and `structuredContent`.

- [ ] **Step 4: Verify runner/results tests**

Run: `npm test -- tests/runner.test.ts tests/results.test.ts`

Expected: PASS.

---

### Task 5: Tool Schemas And Handlers

**Files:**

- Modify: `src/schemas.ts`
- Create: `src/tools.ts`
- Modify: `src/server.ts`
- Create: `tests/tools.test.ts`

- [ ] **Step 1: Write tool tests**

Tests must verify:

- `ast_grep_search` builds `run --pattern <pattern> --json=stream` with safe paths.
- Search with `rewrite` requires `apply` to be provided.
- Search with `rewrite` and `apply: false` does not include `--update-all`.
- Search with `rewrite` and `apply: true` includes `--update-all`.
- `ast_grep_scan` supports `config`, `rule`, `inlineRules`, `filter`, `includeMetadata`, `rewrite`, and `apply` gating.
- `ast_grep_test` builds `test` commands with safe paths.
- Invalid absolute paths fail before command execution.

- [ ] **Step 2: Implement schemas**

Define schemas for:

- `ast_grep_search`: `pattern`, optional `lang`, optional `selector`, optional `strictness`, optional `rewrite`, optional required-when-rewrite `apply`, optional `paths`, optional `globs`, optional `context`, optional `before`, optional `after`, optional `workspaceRoot`.
- `ast_grep_scan`: optional `config`, `rule`, `inlineRules`, `filter`, `includeMetadata`, optional `rewrite`, optional required-when-rewrite `apply`, optional `paths`, optional `workspaceRoot`.
- `ast_grep_test`: optional `paths`, optional `workspaceRoot`.
- `ast_grep_version`: no fields.

- [ ] **Step 3: Implement handlers**

Implement handler factory `createAstGrepTools({ resolveBinary, runCommand })` returning MCP handlers. Use `safeRelativePaths`, `safeRelativePath`, `resolveWorkspaceRoot`, `parseJsonOutput`, and `toStructuredToolResult`. Always pass argv arrays. Never expose `--interactive`. Use `--json=stream` for search and scan.

- [ ] **Step 4: Register tools in server**

Update `src/server.ts` to call the tool factory and register:

- `ast_grep_search`
- `ast_grep_scan`
- `ast_grep_test`
- `ast_grep_version`

- [ ] **Step 5: Verify tool tests**

Run: `npm test -- tests/tools.test.ts`

Expected: PASS.

---

### Task 6: Integration Tests And Documentation

**Files:**

- Create: `tests/integration.test.ts`
- Create: `README.md`
- Modify: `package.json` if needed for executable permissions/build behavior

- [ ] **Step 1: Write integration tests**

Create temp workspaces with sample TypeScript files. Verify:

- Search returns matches.
- Rewrite preview with `apply: false` returns replacements and leaves files unchanged.
- Rewrite apply with `apply: true` changes files.
- Version returns resolved binary metadata.

- [ ] **Step 2: Implement any missing integration glue**

Fix server/tool implementation until integration tests pass without weakening safety.

- [ ] **Step 3: Write README**

Document:

- What the server does.
- Installation with `npm install` and `@ast-grep/cli` fallback.
- MCP stdio config example.
- Tool list and example calls.
- Safety model: workspace-relative paths, no interactive mode, `apply` gate, argv subprocesses, timeouts/output limits.

- [ ] **Step 4: Final verification**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all commands pass.

---

## Self-Review

- Spec coverage: The plan covers stdio MCP server, CLI wrapper, fallback download through `@ast-grep/cli`, search/scan/test/version tools, preview/apply gating, path safety, structured output, errors, tests, and docs.
- Placeholder scan: No task depends on an undefined later-only component. Some test contents are described at acceptance level rather than full line-by-line code where exact mocks depend on implemented seams, but every task has concrete files, commands, and expected outcomes.
- Type consistency: Module names and function names are consistent across tasks: `resolveAstGrepBinary`, `runCommand`, `parseJsonOutput`, `toStructuredToolResult`, `resolveWorkspaceRoot`, `safeRelativePaths`, `createServer`, and `createAstGrepTools`.
