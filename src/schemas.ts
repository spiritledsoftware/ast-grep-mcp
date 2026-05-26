import { z } from "zod";

export const versionInputSchema = z.object({});
export type VersionInput = z.infer<typeof versionInputSchema>;

const strictnessSchema = z.enum(["cst", "smart", "ast", "relaxed", "signature"]);

export const searchInputSchema = z.object({
  pattern: z.string().min(1),
  lang: z.string().min(1).optional(),
  selector: z.string().min(1).optional(),
  strictness: strictnessSchema.optional(),
  rewrite: z.string().optional(),
  apply: z.boolean().optional(),
  paths: z.array(z.string()).optional(),
  globs: z.array(z.string()).optional(),
  context: z.number().int().nonnegative().optional(),
  before: z.number().int().nonnegative().optional(),
  after: z.number().int().nonnegative().optional(),
  workspaceRoot: z.string().optional(),
});

export const scanInputSchema = z.object({
  config: z.string().optional(),
  rule: z.string().optional(),
  inlineRules: z.string().optional(),
  filter: z.string().optional(),
  includeMetadata: z.boolean().optional(),
  rewrite: z.string().optional(),
  apply: z.boolean().optional(),
  paths: z.array(z.string()).optional(),
  workspaceRoot: z.string().optional(),
});

export const testInputSchema = z.object({
  paths: z.array(z.string()).optional(),
  workspaceRoot: z.string().optional(),
});

export type SearchInput = z.infer<typeof searchInputSchema>;
export type ScanInput = z.infer<typeof scanInputSchema>;
export type TestInput = z.infer<typeof testInputSchema>;
