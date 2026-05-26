import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { resolveAstGrepBinary, type ResolvedBinary } from "./binary.js";
import { resolveWorkspaceRoot, safeRelativePath, safeRelativePaths } from "./pathSafety.js";
import { assertCommandSucceeded, runCommand, type CommandResult } from "./runner.js";
import { parseJsonOutput, toErrorToolResult, toStructuredToolResult } from "./results.js";
import type { ScanInput, SearchInput, TestInput, VersionInput } from "./schemas.js";

export interface ToolDependencies {
  resolveBinary?: () => Promise<ResolvedBinary>;
  runCommand?: typeof runCommand;
}

export function createAstGrepTools(dependencies: ToolDependencies = {}) {
  const resolveBinary = dependencies.resolveBinary ?? (() => resolveAstGrepBinary());
  const execute = dependencies.runCommand ?? runCommand;

  async function runAstGrep(
    args: string[],
    workspaceRoot: string,
  ): Promise<CommandResult & { binary: ResolvedBinary }> {
    const binary = await resolveBinary();
    const result = await execute(binary.path, args, {
      cwd: workspaceRoot,
      timeoutMs: 30_000,
      maxOutputBytes: 2_000_000,
    });
    return { ...result, binary };
  }

  return {
    version: async (_input: VersionInput): Promise<CallToolResult> => {
      try {
        const binary = await resolveBinary();
        return toStructuredToolResult({ binary });
      } catch (error) {
        return toErrorToolResult("binary_resolution_failed", errorMessage(error));
      }
    },

    search: async (input: SearchInput): Promise<CallToolResult> => {
      try {
        validateSearchApplyGate(input.rewrite, input.apply);
        const workspaceRoot = resolveWorkspaceRoot(input.workspaceRoot);
        const args = buildSearchArgs(input, workspaceRoot);
        const previewArgs =
          input.apply === true ? args.filter((arg) => arg !== "--update-all") : args;
        const result = await runAstGrep(previewArgs, workspaceRoot);
        assertCommandSucceeded(result);
        if (input.apply === true) {
          const applyResult = await runAstGrep(
            args.filter((arg) => arg !== "--json=stream"),
            workspaceRoot,
          );
          assertCommandSucceeded(applyResult);
        }
        return toStructuredToolResult({
          matches: parseJsonOutput(result.stdout),
          applied: input.apply === true,
          command: [result.command, ...result.args],
          stderr: result.stderr,
          binary: result.binary,
        });
      } catch (error) {
        return toErrorToolResult("ast_grep_search_failed", errorMessage(error));
      }
    },

    scan: async (input: ScanInput): Promise<CallToolResult> => {
      try {
        validateScanApplyGate(input);
        const workspaceRoot = resolveWorkspaceRoot(input.workspaceRoot);
        const args = buildScanArgs(input, workspaceRoot);
        const previewArgs =
          input.apply === true ? args.filter((arg) => arg !== "--update-all") : args;
        const result = await runAstGrep(previewArgs, workspaceRoot);
        assertCommandSucceeded(result);
        if (input.apply === true) {
          const applyResult = await runAstGrep(
            args.filter((arg) => arg !== "--json=stream"),
            workspaceRoot,
          );
          assertCommandSucceeded(applyResult);
        }
        return toStructuredToolResult({
          matches: parseJsonOutput(result.stdout),
          applied: input.apply === true,
          command: [result.command, ...result.args],
          stderr: result.stderr,
          binary: result.binary,
        });
      } catch (error) {
        return toErrorToolResult("ast_grep_scan_failed", errorMessage(error));
      }
    },

    test: async (input: TestInput): Promise<CallToolResult> => {
      try {
        const workspaceRoot = resolveWorkspaceRoot(input.workspaceRoot);
        const args = ["test", ...safeRelativePaths(input.paths, workspaceRoot)];
        const result = await runAstGrep(args, workspaceRoot);
        assertCommandSucceeded(result);
        return toStructuredToolResult({
          result: result.stdout,
          command: [result.command, ...result.args],
          stderr: result.stderr,
          binary: result.binary,
        });
      } catch (error) {
        return toErrorToolResult("ast_grep_test_failed", errorMessage(error));
      }
    },
  };
}

export function buildSearchArgs(input: SearchInput, workspaceRoot: string): string[] {
  const args = ["run", "--pattern", input.pattern, "--json=stream"];
  appendOption(args, "--lang", input.lang);
  appendOption(args, "--selector", input.selector);
  appendOption(args, "--strictness", input.strictness);
  appendOption(args, "--rewrite", input.rewrite);
  appendNumber(args, "--context", input.context);
  appendNumber(args, "--before", input.before);
  appendNumber(args, "--after", input.after);
  for (const glob of input.globs ?? []) appendOption(args, "--globs", glob);
  if (input.apply === true) args.push("--update-all");
  args.push(...safeRelativePaths(input.paths, workspaceRoot));
  return args;
}

export function buildScanArgs(input: ScanInput, workspaceRoot: string): string[] {
  const args = ["scan", "--json=stream"];
  appendOption(
    args,
    "--config",
    input.config ? safeRelativePath(input.config, workspaceRoot) : undefined,
  );
  appendOption(
    args,
    "--rule",
    input.rule ? safeRelativePath(input.rule, workspaceRoot) : undefined,
  );
  appendOption(args, "--inline-rules", input.inlineRules);
  appendOption(args, "--filter", input.filter);
  if (input.includeMetadata) args.push("--include-metadata");
  if (input.apply === true) args.push("--update-all");
  args.push(...safeRelativePaths(input.paths, workspaceRoot));
  return args;
}

function validateSearchApplyGate(rewrite: string | undefined, apply: boolean | undefined): void {
  if (rewrite !== undefined && apply === undefined) {
    throw new Error("apply must be provided when rewrite is provided");
  }
  if (apply === true && rewrite === undefined) {
    throw new Error("apply: true requires a rewrite or fix-capable rule");
  }
}

function validateScanApplyGate(input: ScanInput): void {
  if (input.rewrite !== undefined) {
    throw new Error(
      "ast_grep_scan does not support rewrite; use rule/config fixes with apply instead",
    );
  }

  if (input.apply === true && !input.config && !input.rule && !input.inlineRules && !input.filter) {
    throw new Error(
      "apply: true for scan requires config, rule, inlineRules, or filter with fix-capable rules",
    );
  }
}

function appendOption(args: string[], flag: string, value: string | undefined): void {
  if (value !== undefined) args.push(flag, value);
}

function appendNumber(args: string[], flag: string, value: number | undefined): void {
  if (value !== undefined) args.push(flag, String(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
