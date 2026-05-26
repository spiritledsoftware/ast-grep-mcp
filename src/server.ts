import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { versionInputSchema, searchInputSchema, scanInputSchema, testInputSchema } from "./schemas";
import { createAstGrepTools } from "./tools";
import { version as packageJsonVersion } from "../package.json";

export function createServer(): McpServer {
  const server = new McpServer({ name: "ast-grep-mcp", version: packageJsonVersion });
  const tools = createAstGrepTools();

  server.registerTool(
    "ast_grep_search",
    {
      description: "Search code with ast-grep run. Rewrites require explicit apply boolean.",
      inputSchema: searchInputSchema,
    },
    tools.search,
  );

  server.registerTool(
    "ast_grep_scan",
    {
      description: "Scan code with ast-grep scan using config, rule, inline rules, or filters.",
      inputSchema: scanInputSchema,
    },
    tools.scan,
  );

  server.registerTool(
    "ast_grep_test",
    { description: "Run ast-grep rule tests.", inputSchema: testInputSchema },
    tools.test,
  );

  server.registerTool(
    "ast_grep_version",
    {
      description: "Report the ast-grep binary version and resolved path.",
      inputSchema: versionInputSchema,
    },
    tools.version,
  );

  return server;
}
