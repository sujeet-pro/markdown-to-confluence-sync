import { writeFileSync } from "node:fs";
import { getFullConfig } from "../../lib/config.js";
import { ConfluenceClient } from "../../lib/confluence.js";
import { parseConfluenceUrl } from "../../lib/url-parser.js";
import { adfToMarkdown } from "../../lib/adf-to-markdown.js";
import type { AdfDocument } from "../../lib/types.js";

interface ReadOptions {
  output?: string;
}

/**
 * Read a Confluence page and output its content as Markdown.
 * Prints to stdout by default, or writes to a file with --output.
 */
export async function readAction(url: string, options: ReadOptions): Promise<void> {
  const config = getFullConfig();
  const client = new ConfluenceClient(config.baseUrl, config.email, config.token);

  const parsed = parseConfluenceUrl(url);
  if (!parsed.pageId) {
    throw new Error("URL must point to a specific page. Space URLs are not supported for read.");
  }

  const page = await client.getPage(parsed.pageId);
  const adfValue = page.body?.atlas_doc_format?.value;
  if (!adfValue) {
    throw new Error("Page has no ADF content.");
  }

  const adf = JSON.parse(adfValue) as AdfDocument;
  const markdown = adfToMarkdown(adf);

  if (options.output) {
    writeFileSync(options.output, markdown, "utf-8");
  } else {
    process.stdout.write(markdown);
  }
}
