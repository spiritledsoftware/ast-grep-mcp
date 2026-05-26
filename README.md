# ast-grep MCP

`ast-grep-mcp` is a local stdio [Model Context Protocol](https://modelcontextprotocol.io/) server that gives agents access to the real [`ast-grep`](https://ast-grep.github.io/) CLI for structural search, scan, rule testing, and explicitly gated rewrites.

It is designed for agentic coding workflows where text search is not enough and filesystem safety matters.

## Features

- Structural search with `ast-grep run` and JSON results.
- Project scans with `ast-grep scan` using config files, rule files, inline rules, or filters.
- Rule test execution with `ast-grep test`.
- Version and binary resolution diagnostics.
- Rewrite preview by default, with mutation gated behind an explicit `apply: true` input.
- Workspace-relative path validation that rejects absolute paths, `..` escapes, and symlinks that resolve outside the workspace.
- No network listener: stdio transport only.

## Requirements

- Node.js 20 or newer.
- An MCP client that can launch stdio servers.

The package depends on `@ast-grep/cli`, which installs the matching platform binary during package installation. You can still override binary resolution with `AST_GREP_BIN` when needed.

## Installation

Use it directly from npm in your MCP client configuration:

```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "npx",
      "args": ["-y", "ast-grep-mcp"],
      "cwd": "/path/to/workspace"
    }
  }
}
```

Or install it globally:

```bash
npm install -g ast-grep-mcp
```

```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "ast-grep-mcp",
      "cwd": "/path/to/workspace"
    }
  }
}
```

Set `cwd` to the workspace the agent should inspect. Tool paths are resolved relative to that workspace.

## Tools

| Tool               | Purpose                                                                               |
| ------------------ | ------------------------------------------------------------------------------------- |
| `ast_grep_search`  | Runs `ast-grep run` with structural patterns, optional rewrites, and JSON output.     |
| `ast_grep_scan`    | Runs `ast-grep scan` with config, rule files, inline rules, filters, and JSON output. |
| `ast_grep_test`    | Runs `ast-grep test` for rule suites.                                                 |
| `ast_grep_version` | Reports the resolved ast-grep binary path, source, and version.                       |

## Rewrite Safety

Rewrite-capable requests require an explicit `apply` value:

```json
{
  "pattern": "$A && $A()",
  "rewrite": "$A?.()",
  "apply": false,
  "lang": "ts",
  "paths": ["src"]
}
```

- `apply: false` previews replacements and does not pass `--update-all`.
- `apply: true` passes `--update-all` and applies all replacements or scan rule fixes.
- `rewrite` requires `apply`, so callers must explicitly choose preview or mutation.
- `apply: true` without a rewrite or fix-capable scan request is rejected.

For `ast_grep_scan`, fixes must be defined in ast-grep rules or config. `scan` does not accept an ad-hoc `rewrite` string.

## Binary Resolution

The server resolves ast-grep in this order:

1. `AST_GREP_BIN`
2. `ast-grep` on `PATH`
3. `sg` on `PATH`, only when `sg --version` identifies ast-grep
4. The bundled `@ast-grep/cli` dependency

Use `ast_grep_version` to confirm which binary the server selected.

## Safety Model

- stdio only; no HTTP server or socket listener.
- All file inputs are workspace-relative.
- Absolute paths and `..` escapes are rejected.
- Existing symlink components that resolve outside the workspace are rejected.
- Commands use `spawn` argv arrays with `shell: false`.
- Interactive ast-grep mode is not exposed.
- Tool calls use timeouts and bounded stdout/stderr buffers.
- Results are returned as JSON text plus MCP `structuredContent`.

## Local Development

```bash
pnpm install
pnpm run verify
```

Useful scripts:

| Script                  | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `pnpm run dev`          | Start the MCP server from TypeScript source.                  |
| `pnpm run build`        | Clean and build declarations plus the bundled CLI entrypoint. |
| `pnpm run test`         | Run the Vitest suite.                                         |
| `pnpm run typecheck`    | Run TypeScript type checking.                                 |
| `pnpm run format:check` | Check formatting with oxfmt.                                  |
| `pnpm run lint`         | Lint with oxlint.                                             |
| `pnpm run verify`       | Run format, lint, typecheck, tests, and build.                |
| `pnpm run pack:dry-run` | Build and inspect the npm package contents.                   |

For local MCP development against this repository:

```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "pnpm",
      "args": ["run", "dev"],
      "cwd": "/path/to/ast-grep-mcp"
    }
  }
}
```

When developing the server itself, launch it from this repository. When using the published package, set `cwd` to the target workspace.

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) and GitHub Actions.

1. Add a changeset with `pnpm changeset` for user-facing changes.
2. Open a pull request. The PR workflow runs formatting, linting, type checking, tests, build, and an npm pack dry run on Node 20 and 22.
3. Merge to `main`. The release workflow opens or updates a version PR.
4. Merge the version PR. The release workflow publishes to npm with provenance using `NPM_TOKEN`.

Repository maintainers need to configure an npm automation token as the `NPM_TOKEN` GitHub Actions secret.

## License

MIT
