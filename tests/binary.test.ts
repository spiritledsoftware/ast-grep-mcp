import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAstGrepBinary } from "../src/binary";

function fakeBinary(dir: string, name: string, output: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, `#!/usr/bin/env sh\necho "${output}"\n`);
  fs.chmodSync(file, 0o755);
  return file;
}

describe("resolveAstGrepBinary", () => {
  it("uses AST_GREP_BIN when provided", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ast-grep-bin-"));
    const bin = fakeBinary(dir, "custom-ast-grep", "ast-grep 1.2.3");
    await expect(resolveAstGrepBinary({ AST_GREP_BIN: bin, PATH: "" })).resolves.toMatchObject({
      path: bin,
      source: "env",
      version: "ast-grep 1.2.3",
    });
  });

  it("prefers ast-grep on PATH", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ast-grep-bin-"));
    const bin = fakeBinary(dir, "ast-grep", "ast-grep 2.0.0");
    await expect(resolveAstGrepBinary({ PATH: dir })).resolves.toMatchObject({
      path: bin,
      source: "path",
    });
  });

  it("uses sg only when it is ast-grep", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ast-grep-bin-"));
    const bin = fakeBinary(dir, "sg", "ast-grep 3.0.0");
    await expect(resolveAstGrepBinary({ PATH: dir })).resolves.toMatchObject({
      path: bin,
      source: "sg",
    });
  });
});
