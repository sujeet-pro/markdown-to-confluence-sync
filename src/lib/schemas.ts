import { z } from "zod";

/** Schema for a complete md2cf configuration (email, token, baseUrl). */
export const Md2cfConfigSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  token: z.string().min(1, "API token is required"),
  baseUrl: z.string().min(1, "Base URL is required").url("Invalid URL"),
});

/** Schema for a partial config (all fields optional, used during loading/saving). */
export const PartialMd2cfConfigSchema = Md2cfConfigSchema.partial();

/** Valid merge strategy values for diff-based sync. */
export const MergeStrategySchema = z.enum(["auto-merge", "local-wins", "remote-wins", "append"]);

/** Schema for sync command options (url, create, title, dryRun, yes, strategy). */
export const SyncOptionsSchema = z.object({
  url: z.string().url("Invalid Confluence URL").optional(),
  create: z.boolean().optional(),
  title: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
  yes: z.boolean().optional(),
  strategy: MergeStrategySchema.optional(),
});

/** Schema for a parsed Confluence URL (baseUrl, optional spaceKey and pageId). */
export const ParsedConfluenceUrlSchema = z.object({
  baseUrl: z.string().url(),
  spaceKey: z.string().optional(),
  pageId: z.string().optional(),
});
