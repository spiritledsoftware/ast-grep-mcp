---
title: AST Grep MCP Server
summary: AST Grep MCP server architecture, tool behavior, path safety, result handling, and integration expectations.
tags: []
related: [architecture/mcp_server/ast_grep_mcp_server.md]
keywords: []
createdAt: '2026-05-25T19:59:04.606Z'
updatedAt: '2026-05-26T14:56:49.100Z'
---
## Reason
Curate concise architecture notes about the MCP server from the provided context

## Raw Concept
**Task:**
Document the AST Grep MCP server architecture and related implementation details.

**Changes:**
- Identified the repository as empty and requiring a fresh scaffold
- Narrowed the first design choice to the MCP transport and API surface
- Recommended stdio as the initial transport with dual transport as a later expansion path
- Compared CLI wrapper, Node NAPI server, and hybrid approaches
- Recommended CLI wrapper stdio server
- Raised the open decision of read-only versus rewrite support
- Captured the server context as durable knowledge
- Preserved the working module findings as durable knowledge
- Curated the working module knowledge into the context tree
- Wrote the implementation plan
- Built the TypeScript stdio MCP server
- Added safety checks, runner controls, structured responses, and documentation
- Added unit and integration tests
- Captured the server-oriented architecture context for durable recall.

**Files:**
- `ast_grep_search`: runs `ast-grep run`.
- `ast_grep_scan`: runs `ast-grep scan` against config, rule file, inline rules, or filter.
- `ast_grep_test`: runs `ast-grep test` for rule suites.
- `ast_grep_version`: reports resolved binary path and version.
- `apply: false`: preview only. Runs ast-grep with JSON output and rewrite metadata where possible, returning matches and proposed replacements without modifying files.
- `apply: true`: applies changes with `--update-all`, only after validating paths remain inside the workspace.
- `apply` is required on rewrite-capable calls, so agents must explicitly choose preview or mutation.
- All paths are interpreted relative to a configured workspace root.
- Absolute paths and `..` escapes are rejected.
- No interactive mode is exposed.
- Commands use argv arrays, not shell strings.
- Errors return structured diagnostics: command, exit code, stderr excerpt, and validation hints.
- Unit tests for binary resolution, path safety, argv construction, JSON parsing, and apply gating.
- Tests cover preview no-write behavior and `apply: true` mutation behavior.
- docs/superpowers/plans/2026-05-25-ast-grep-mcp.md
- src/index.ts
- src/server.ts
- src/tools.ts
- src/runner.ts
- src/results.ts
- src/pathSafety.ts
- src/binary.ts
- src/schemas.ts
- README.md
- tests/binary.test.ts
- tests/integration.test.ts
- tests/pathSafety.test.ts
- tests/results.test.ts
- tests/runner.test.ts
- tests/smoke.test.ts
- tests/tools.test.ts

**Flow:**
request -> validate paths -> run matching logic -> format results -> expose MCP tools

**Timestamp:** 2026-05-26T14:56:41.088Z

**Author:** ByteRover context curation

## Narrative
### Structure
The curated knowledge centers on the MCP server implementation and the supporting modules that govern execution, safety checks, result shaping, and tool exposure.

### Dependencies
Depends on the runner, result serialization, schema definitions, and path safety logic to keep server operations reliable.

### Highlights
Preserves the server architecture as a reusable knowledge entry for future lookups and updates.

### Rules
Use UPSERT for context-tree curation unless a direct ADD or UPDATE is explicitly required. Do not rely on chat-only recall for durable module knowledge.

### Examples
Example outcome: working module findings are stored in the context tree so future sessions can retrieve them directly.

## Facts
- **server_type**: The project implements an AST Grep MCP server. [project]
- **curation_scope**: The knowledge being curated focuses on server architecture, path safety, runner behavior, result handling, schemas, and tools. [project]

---

## Combined Overview

- Complete implementation status: the ast-grep MCP server is finished and verified.
- Core architecture: a TypeScript stdio MCP server with tool modules, subprocess runner, result formatting, schema definitions, and path-safety utilities.
- Exposed tools: `ast_grep_search`, `ast_grep_scan`, `ast_grep_test`, and `ast_grep_version`.
- Safety and execution model: workspace-relative paths only, absolute paths and `..` traversal rejected, no interactive mode, argv arrays used instead of shell strings, and subprocess controls include timeouts/output limits.
- Rewrite behavior decision: rewrite-capable calls require explicit `apply`; preview mode returns matches and proposed replacements without modifying files, while `apply: true` mutates files only after path validation.
- Binary resolution pattern: supports `AST_GREP_BIN`, `PATH`, verified `sg`, and `@ast-grep/cli` fallback.
- Response and error handling: structured JSON responses with JSON stream/array parsing and diagnostics that include command, exit code, stderr excerpt, and validation hints.
- Verification outcome: tests, typecheck, and build all passed; specifically 7 test files and 41 tests succeeded.
- Structure summary: the document is organized into Reason, Raw Concept, Narrative, Facts, and a flow from plan through implementation, safety/parsing, tests/docs, and verification.
- Notable entities/decisions: `apply: false` vs `apply: true`, safe workspace root handling, read-only vs rewrite support as an explicit design choice, and context-tree curation via UPSERT for durable knowledge.
