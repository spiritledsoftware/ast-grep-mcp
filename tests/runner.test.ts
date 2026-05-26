import process from "node:process";
import { describe, expect, it } from "vitest";
import { runCommand } from "../src/runner.js";

const node = process.execPath;

describe("runCommand", () => {
  it("captures successful stdout", async () => {
    const result = await runCommand(node, ["-e", 'process.stdout.write("ok")'], {
      cwd: process.cwd(),
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("ok");
  });

  it("captures non-zero stderr", async () => {
    const result = await runCommand(node, ["-e", 'process.stderr.write("bad"); process.exit(2)'], {
      cwd: process.cwd(),
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe("bad");
  });

  it("marks timeout", async () => {
    const result = await runCommand(node, ["-e", "setTimeout(() => {}, 1000)"], {
      cwd: process.cwd(),
      timeoutMs: 50,
    });
    expect(result.timedOut).toBe(true);
  });

  it("truncates output", async () => {
    const result = await runCommand(node, ["-e", 'process.stdout.write("abcdef")'], {
      cwd: process.cwd(),
      maxOutputBytes: 3,
    });
    expect(result.stdout).toBe("abc");
    expect(result.truncated).toBe(true);
  });
});
