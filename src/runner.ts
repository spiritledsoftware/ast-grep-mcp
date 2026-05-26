import { spawn } from "node:child_process";

export interface CommandResult {
  command: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
}

export interface RunCommandOptions {
  cwd: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 2_000_000;

export function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions,
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let truncated = false;
    let settled = false;
    let timedOut = false;

    const appendBounded = (current: string, chunk: Buffer, currentBytes: number) => {
      if (currentBytes >= maxOutputBytes) {
        truncated = true;
        return { text: current, bytes: currentBytes };
      }

      const remaining = maxOutputBytes - currentBytes;
      const next = chunk.subarray(0, remaining);
      if (next.length < chunk.length) {
        truncated = true;
      }
      return { text: current + next.toString("utf8"), bytes: currentBytes + next.length };
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      const next = appendBounded(stdout, chunk, stdoutBytes);
      stdout = next.text;
      stdoutBytes = next.bytes;
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const next = appendBounded(stderr, chunk, stderrBytes);
      stderr = next.text;
      stderrBytes = next.bytes;
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ command, args, exitCode: 1, stdout, stderr: error.message, timedOut, truncated });
    });

    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ command, args, exitCode, stdout, stderr, timedOut, truncated });
    });
  });
}

export function assertCommandSucceeded(result: CommandResult): void {
  if (result.exitCode === 0 && !result.timedOut) {
    return;
  }

  const diagnostic = {
    command: [result.command, ...result.args].join(" "),
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stderr: result.stderr.slice(0, 4000),
  };
  throw new Error(`ast-grep command failed: ${JSON.stringify(diagnostic)}`);
}
