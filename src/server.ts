import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  versionInputSchema,
  searchInputSchema,
  scanInputSchema,
  testInputSchema,
} from "./schemas.js";
import { createAstGrepTools } from "./tools.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "ast-grep-mcp", version: "0.1.0" });
  const tools = createAstGrepTools();

  server.tool(
    "ast_grep_search",
    "Search code with ast-grep run. Rewrites require explicit apply boolean.",
    searchInputSchema.shape,
    tools.search,
  );

  server.tool(
    "ast_grep_scan",
    "Scan code with ast-grep scan using config, rule, inline rules, or filters.",
    scanInputSchema.shape,
    tools.scan,
  );

  server.tool("ast_grep_test", "Run ast-grep rule tests.", testInputSchema.shape, tools.test);

  server.tool(
    "ast_grep_version",
    "Report the ast-grep binary version and resolved path.",
    versionInputSchema.shape,
    tools.version,
  );

  return server;
}
