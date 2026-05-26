import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createAstGrepTools } from "../src/tools";

function tempWorkspace(): string {
  const tempRoot = path.join(process.cwd(), ".tmp-tests");
  fs.mkdirSync(tempRoot, { recursive: true });
  const workspace = fs.mkdtempSync(path.join(tempRoot, "ast-grep-mcp-integration-"));
  fs.writeFileSync(path.join(workspace, "sample.ts"), "const value = foo && foo();\n");
  return workspace;
}

describe("ast-grep tool integration", () => {
  it("reports binary metadata", async () => {
    const result = await createAstGrepTools().version({});
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.binary).toMatchObject({ path: expect.any(String) });
  });

  it("searches a temp workspace", async () => {
    const workspace = tempWorkspace();
    const result = await createAstGrepTools().search({
      pattern: "$A && $A()",
      lang: "ts",
      paths: ["sample.ts"],
      workspaceRoot: workspace,
    });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.matches).toEqual(
      expect.arrayContaining([expect.objectContaining({ file: "sample.ts" })]),
    );
  });

  it("previews rewrites without changing files", async () => {
    const workspace = tempWorkspace();
    const file = path.join(workspace, "sample.ts");
    const result = await createAstGrepTools().search({
      pattern: "$A && $A()",
      rewrite: "$A?.()",
      apply: false,
      lang: "ts",
      paths: ["sample.ts"],
      workspaceRoot: workspace,
    });
    expect(result.isError).toBeUndefined();
    expect(fs.readFileSync(file, "utf8")).toBe("const value = foo && foo();\n");
    expect(JSON.stringify(result.structuredContent?.matches)).toContain("foo?.()");
  });

  it("applies rewrites when apply is true", async () => {
    const workspace = tempWorkspace();
    const file = path.join(workspace, "sample.ts");
    const result = await createAstGrepTools().search({
      pattern: "$A && $A()",
      rewrite: "$A?.()",
      apply: true,
      lang: "ts",
      paths: ["sample.ts"],
      workspaceRoot: workspace,
    });
    expect(result.isError).toBeUndefined();
    expect(fs.readFileSync(file, "utf8")).toBe("const value = foo?.();\n");
  });

  it("applies scan rule fixes when apply is true", async () => {
    const workspace = tempWorkspace();
    const file = path.join(workspace, "sample.ts");
    const inlineRules = `
id: optional-chain
language: TypeScript
rule:
  pattern: $A && $A()
fix: $A?.()
`;

    const result = await createAstGrepTools().scan({
      inlineRules,
      apply: true,
      paths: ["sample.ts"],
      workspaceRoot: workspace,
    });

    expect(result.isError).toBeUndefined();
    expect(fs.readFileSync(file, "utf8")).toBe("const value = foo?.();\n");
  });
});
