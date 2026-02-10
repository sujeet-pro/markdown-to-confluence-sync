import { markdownToAdf } from "marklassian";
import type { AdfDocument, AdfNode, MermaidBlock } from "./types.js";

const TOC_PLACEHOLDER = "CONFLUENCE_TOC_MACRO_PLACEHOLDER";

/**
 * Regex to match a TOC heading line (## Table of Contents, ## TOC, ## Contents, etc.).
 */
const TOC_HEADING_REGEX = /^#{1,6}\s+(Table\s+of\s+Contents|TOC|Contents)\s*$/im;

/**
 * Detect and strip a Table of Contents section from markdown, replacing it
 * with a placeholder. The TOC heading and all following non-heading lines
 * (the link list) are removed.
 */
export function stripTocSection(markdown: string): { markdown: string; hasToc: boolean } {
  const lines = markdown.split("\n");
  const tocIdx = lines.findIndex((line) => TOC_HEADING_REGEX.test(line));
  if (tocIdx === -1) {
    return { markdown, hasToc: false };
  }

  // Find where the TOC content ends (next heading or end of file)
  let endIdx = lines.length;
  for (let i = tocIdx + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const before = lines.slice(0, tocIdx);
  const after = lines.slice(endIdx);
  const replaced = [...before, TOC_PLACEHOLDER, "", ...after].join("\n");
  return { markdown: replaced, hasToc: true };
}

/**
 * ADF node for the Confluence Table of Contents macro (levels 1–2).
 */
function makeTocMacroNode(): AdfNode {
  return {
    type: "extension",
    attrs: {
      extensionType: "com.atlassian.confluence.macro.core",
      extensionKey: "toc",
      parameters: {
        macroParams: {
          maxLevel: { value: "2" },
          minLevel: { value: "1" },
        },
      },
    },
  };
}

/**
 * Replace TOC placeholder paragraphs in an ADF document with the
 * Confluence Table of Contents macro extension node.
 */
export function injectTocMacro(adf: AdfDocument): AdfDocument {
  const newContent: AdfNode[] = [];
  for (const node of adf.content) {
    if (containsText(node, TOC_PLACEHOLDER)) {
      newContent.push(makeTocMacroNode());
    } else {
      newContent.push(node);
    }
  }
  return { ...adf, content: newContent };
}

/** Check whether an ADF node (or its children) contains specific text. */
function containsText(node: AdfNode, text: string): boolean {
  if (node.text?.includes(text)) return true;
  if (node.content) {
    return node.content.some((child) => containsText(child, text));
  }
  return false;
}

/**
 * Convert a markdown string to an Atlassian Document Format (ADF) document.
 * Detects Table of Contents sections and replaces them with the Confluence TOC macro.
 */
export function convertMarkdownToAdf(markdown: string): AdfDocument {
  const { markdown: processed, hasToc } = stripTocSection(markdown);
  const adf = markdownToAdf(processed) as AdfDocument;
  return hasToc ? injectTocMacro(adf) : adf;
}

/**
 * Extract the title from markdown content.
 * Returns the first H1 heading, or null if none found.
 */
export function extractTitle(markdown: string): string | null {
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Map from mermaid diagram filename to its uploaded attachment info.
 */
export interface AttachmentMap {
  [filename: string]: { fileId: string; collectionName: string };
}

/**
 * Inject mermaid diagram images and collapsible source code blocks into an ADF document.
 *
 * Walks the ADF tree looking for text nodes containing MERMAID_DIAGRAM_PLACEHOLDER_N
 * or MERMAID_ERROR_PLACEHOLDER_N, and replaces the parent paragraph with:
 *   1. A mediaSingle node (rendered PNG image) — only for successful renders
 *   2. An expand node (collapsible code block with original mermaid source)
 *
 * For failed renders, only the expand node with the source code is inserted.
 */
export function injectMermaidAdf(
  adf: AdfDocument,
  blocks: MermaidBlock[],
  attachmentMap: AttachmentMap,
): AdfDocument {
  const newContent: AdfNode[] = [];

  for (const node of adf.content) {
    const placeholderMatch = findMermaidPlaceholder(node);
    if (placeholderMatch) {
      const { index, isError } = placeholderMatch;
      const block = blocks.find((b) => b.index === index);

      if (block && !isError && block.success && block.filename) {
        const attachment = attachmentMap[block.filename];
        if (attachment) {
          // Add the rendered image
          newContent.push({
            type: "mediaSingle",
            attrs: { layout: "center" },
            content: [
              {
                type: "media",
                attrs: {
                  type: "file",
                  collection: attachment.collectionName,
                  id: attachment.fileId,
                  alt: block.filename,
                },
              },
            ],
          });
        }
      }

      // Add collapsible source code block for all mermaid blocks (success or error)
      if (block) {
        const expandTitle = isError
          ? `Mermaid Source (render failed: ${block.error || "unknown error"})`
          : "View Mermaid Source Code";

        newContent.push({
          type: "expand",
          attrs: { title: expandTitle },
          content: [
            {
              type: "codeBlock",
              attrs: { language: "text" },
              content: [{ type: "text", text: block.code }],
            },
          ],
        });
      }
    } else {
      newContent.push(node);
    }
  }

  return { ...adf, content: newContent };
}

/**
 * Check if an ADF node contains a mermaid placeholder.
 * Returns the placeholder index and type, or null if not found.
 */
function findMermaidPlaceholder(node: AdfNode): { index: number; isError: boolean } | null {
  // Check text in this node
  if (node.text) {
    const match = node.text.match(/MERMAID_(DIAGRAM|ERROR)_PLACEHOLDER_(\d+)/);
    if (match) {
      return { index: parseInt(match[2], 10), isError: match[1] === "ERROR" };
    }
  }

  // Check child nodes
  if (node.content) {
    for (const child of node.content) {
      const result = findMermaidPlaceholder(child);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Derive a page title from the source path or URL.
 * Strips extension and converts hyphens/underscores to spaces.
 */
export function titleFromFilename(source: string): string {
  let name: string;
  try {
    const url = new URL(source);
    const segments = url.pathname.split("/").filter(Boolean);
    name = segments[segments.length - 1] || "Untitled";
  } catch {
    const segments = source.replace(/\\/g, "/").split("/").filter(Boolean);
    name = segments[segments.length - 1] || "Untitled";
  }

  // Remove file extension
  name = name.replace(/\.\w+$/, "");

  // Convert hyphens and underscores to spaces, then title-case
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
