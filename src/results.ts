import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface ToolOutput {
  [key: string]: unknown;
  matches?: unknown[];
  result?: unknown;
  command?: string[];
  stderr?: string;
  applied?: boolean;
  binary?: unknown;
}

export function parseJsonOutput(stdout: string): unknown[] {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Expected ast-grep JSON output to be an array");
    }
    return parsed;
  }

  return trimmed
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

export function toStructuredToolResult(output: ToolOutput): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
    structuredContent: output,
  };
}

export function toErrorToolResult(
  code: string,
  message: string,
  details?: unknown,
): CallToolResult {
  const output: Record<string, unknown> = { code, message, details };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
    structuredContent: output,
  };
}
