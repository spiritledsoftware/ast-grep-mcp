import { describe, expect, it } from "vitest";
import { parseJsonOutput, toStructuredToolResult } from "../src/results.js";

describe("parseJsonOutput", () => {
  it("returns empty array for empty output", () => {
    expect(parseJsonOutput("")).toEqual([]);
  });

  it("parses JSON arrays", () => {
    expect(parseJsonOutput('[{"file":"a.ts"}]')).toEqual([{ file: "a.ts" }]);
  });

  it("parses newline-delimited JSON stream output", () => {
    expect(parseJsonOutput('{"file":"a.ts"}\n{"file":"b.ts"}\n')).toEqual([
      { file: "a.ts" },
      { file: "b.ts" },
    ]);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseJsonOutput("{bad")).toThrow();
  });
});

describe("toStructuredToolResult", () => {
  it("returns text and structured content", () => {
    const output = { matches: [{ file: "a.ts" }] };
    const result = toStructuredToolResult(output);
    expect(result.structuredContent).toEqual(output);
    expect(result.content[0]).toMatchObject({ type: "text" });
  });
});
