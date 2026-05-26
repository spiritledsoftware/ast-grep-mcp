import { access, constants } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "./runner.js";

export interface ResolvedBinary {
  path: string;
  source: "env" | "path" | "sg" | "local-package";
  version?: string;
}

export async function resolveAstGrepBinary(env = process.env): Promise<ResolvedBinary> {
  if (env.AST_GREP_BIN) {
    await assertExists(env.AST_GREP_BIN);
    return withVersion({ path: env.AST_GREP_BIN, source: "env" });
  }

  const astGrep = await findOnPath("ast-grep", env.PATH);
  if (astGrep) {
    try {
      return await withVersion({ path: astGrep, source: "path" });
    } catch {
      // Continue to verified sg/local fallback when PATH contains an unusable binary.
    }
  }

  const sg = await findOnPath("sg", env.PATH);
  if (sg && (await isAstGrep(sg))) {
    return withVersion({ path: sg, source: "sg" });
  }

  return withVersion({ path: await resolveLocalPackageBinary(), source: "local-package" });
}

export async function getAstGrepVersion(binaryPath: string): Promise<string> {
  const result = await runCommand(binaryPath, ["--version"], {
    cwd: process.cwd(),
    timeoutMs: 5000,
    maxOutputBytes: 20_000,
  });
  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error(`Failed to run ast-grep --version: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function withVersion(binary: Omit<ResolvedBinary, "version">): Promise<ResolvedBinary> {
  return { ...binary, version: await getAstGrepVersion(binary.path) };
}

async function isAstGrep(binaryPath: string): Promise<boolean> {
  try {
    return /ast-grep/i.test(await getAstGrepVersion(binaryPath));
  } catch {
    return false;
  }
}

async function findOnPath(command: string, pathValue: string | undefined): Promise<string | null> {
  const extensions = process.platform === "win32" ? [".cmd", ".exe", ""] : [""];
  for (const segment of (pathValue ?? "").split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(segment, `${command}${extension}`);
      if (await exists(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

async function resolveLocalPackageBinary(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const names = process.platform === "win32" ? ["ast-grep.cmd", "ast-grep.exe"] : ["ast-grep"];
  const roots = [path.resolve(here, ".."), path.resolve(here, "..", "..")];

  for (const root of roots) {
    for (const name of names) {
      const candidate = path.join(root, "node_modules", ".bin", name);
      if (await exists(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error(
    "Could not find ast-grep. Install it on PATH or run npm install to fetch @ast-grep/cli.",
  );
}

async function assertExists(filePath: string): Promise<void> {
  if (!(await exists(filePath))) {
    throw new Error(`AST_GREP_BIN does not exist: ${filePath}`);
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
