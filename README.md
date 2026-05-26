# ast-grep MCP

`ast-grep-mcp` is a local stdio MCP server that exposes the real `ast-grep` CLI to agents for structural search, scan, rule testing, and explicitly gated rewrites.

## Install

```bash
npm install
npm run build
```

The server resolves the ast-grep binary in this order:

1. `AST_GREP_BIN`
2. `ast-grep` on `PATH`
3. `sg` on `PATH`, only when `sg --version` identifies ast-grep
4. the project dependency `@ast-grep/cli`

`@ast-grep/cli` downloads the matching platform binary during npm install, so tool calls do not need surprise network access.

## MCP Configuration

```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "node",
      "args": ["/path/to/ast-grep-mcp/dist/index.js"]
    }
  }
}
```

For local development:

```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/path/to/ast-grep-mcp"
    }
  }
}
```

Start the MCP server with `cwd` set to the target workspace you want ast-grep to inspect. The optional `workspaceRoot` argument is resolved inside that process cwd; this prevents an agent from launching the server in one directory and scanning unrelated filesystem locations.

## Tools

- `ast_grep_search`: runs `ast-grep run` with `--json=stream`.
- `ast_grep_scan`: runs `ast-grep scan` with config, rule, inline rules, filters, and JSON output. Scan fixes must be defined in ast-grep rules/config; `scan` does not accept an ad-hoc `rewrite` string.
- `ast_grep_test`: runs `ast-grep test` for rule suites.
- `ast_grep_version`: reports resolved binary path, source, and version.

## Rewrite Safety

Rewrite-capable calls use one explicit gate:

```json
{
  "pattern": "$A && $A()",
  "rewrite": "$A?.()",
  "apply": false,
  "lang": "ts",
  "paths": ["src"]
}
```

- `apply: false` previews replacements and does not include `--update-all`.
- `apply: true` includes `--update-all` and applies all replacements or scan rule fixes.
- `rewrite` requires `apply` so agents must explicitly choose preview or mutation.
- `apply: true` without a rewrite/fix-capable request is rejected. For `ast_grep_scan`, fix-capable means using `config`, `rule`, `inlineRules`, or `filter` rules that define fixes.

## Safety Model

- stdio only; no network listener.
- Paths are workspace-relative.
- Absolute paths and `..` escapes are rejected.
- Existing symlink components that resolve outside the workspace are rejected.
- Commands use `spawn` argv arrays with `shell: false`.
- Interactive ast-grep mode is not exposed.
- Tool calls use timeouts and bounded stdout/stderr buffers.
- Results are returned as JSON text plus MCP `structuredContent`.

## Development

```bash
npm test
npm run typecheck
npm run build
```
