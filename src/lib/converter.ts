import { markdownToAdf } from "marklassian";
import type { AdfDocument, AdfNode, MermaidBlock, PanelBlock, ExpandBlock } from "./types.js";

const TOC_PLACEHOLDER = "CONFLUENCE_TOC_MACRO_PLACEHOLDER";
const PANEL_PLACEHOLDER_PREFIX = "CONFLUENCE_PANEL_PLACEHOLDER_";
const EXPAND_PLACEHOLDER_PREFIX = "CONFLUENCE_EXPAND_PLACEHOLDER_";

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
 * GFM alert type → Confluence panel type mapping.
 */
const ALERT_TO_PANEL: Record<string, PanelBlock["panelType"]> = {
  NOTE: "info",
  TIP: "success",
  IMPORTANT: "note",
  WARNING: "warning",
  CAUTION: "error",
};

/**
 * Detect and strip GFM alert blockquotes (> [!NOTE], > [!TIP], etc.),
 * replacing them with placeholders. Skips matches inside fenced code blocks.
 */
export function stripPanelBlocks(
  markdown: string,
): { markdown: string; panels: PanelBlock[] } {
  const lines = markdown.split("\n");
  const panels: PanelBlock[] = [];
  const result: string[] = [];
  let inCodeBlock = false;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Toggle code-block fence tracking
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      i++;
      continue;
    }

    if (inCodeBlock) {
      result.push(line);
      i++;
      continue;
    }

    // Check for GFM alert start: > [!TYPE]
    const alertMatch = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/);
    if (alertMatch) {
      const alertType = alertMatch[1];
      const panelType = ALERT_TO_PANEL[alertType];
      const contentLines: string[] = [];
      i++; // skip the alert header line

      // Collect subsequent > lines (content of the blockquote)
      while (i < lines.length && /^>/.test(lines[i])) {
        // Strip the leading "> " or ">"
        contentLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }

      const idx = panels.length;
      panels.push({
        index: idx,
        panelType,
        contentMarkdown: contentLines.join("\n").trim(),
      });
      result.push(`${PANEL_PLACEHOLDER_PREFIX}${idx}`);
      continue;
    }

    result.push(line);
    i++;
  }

  return { markdown: result.join("\n"), panels };
}

/**
 * Replace panel placeholder paragraphs in an ADF document with Confluence panel nodes.
 */
export function injectPanelAdf(
  adf: AdfDocument,
  panels: PanelBlock[],
): AdfDocument {
  const newContent: AdfNode[] = [];

  for (const node of adf.content) {
    const placeholderIdx = findPlaceholderIndex(node, PANEL_PLACEHOLDER_PREFIX);
    if (placeholderIdx !== null) {
      const panel = panels.find((p) => p.index === placeholderIdx);
      if (panel) {
        const innerAdf = panel.contentMarkdown
          ? (markdownToAdf(panel.contentMarkdown) as AdfDocument)
          : { version: 1 as const, type: "doc" as const, content: [] };
        newContent.push({
          type: "panel",
          attrs: { panelType: panel.panelType },
          content: innerAdf.content,
        });
        continue;
      }
    }
    newContent.push(node);
  }

  return { ...adf, content: newContent };
}

/**
 * Detect and strip :::expand directives, replacing them with placeholders.
 * Skips matches inside fenced code blocks.
 */
export function stripExpandBlocks(
  markdown: string,
): { markdown: string; expands: ExpandBlock[] } {
  const lines = markdown.split("\n");
  const expands: ExpandBlock[] = [];
  const result: string[] = [];
  let inCodeBlock = false;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Toggle code-block fence tracking
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      i++;
      continue;
    }

    if (inCodeBlock) {
      result.push(line);
      i++;
      continue;
    }

    // Check for :::expand Title
    const expandMatch = line.match(/^:::expand\s+(.+)$/);
    if (expandMatch) {
      const title = expandMatch[1].trim();
      const contentLines: string[] = [];
      i++; // skip the opening line

      // Collect lines until closing ::: (not inside a code block)
      let innerCodeBlock = false;
      while (i < lines.length) {
        if (/^```/.test(lines[i])) {
          innerCodeBlock = !innerCodeBlock;
        }
        if (!innerCodeBlock && /^:::$/.test(lines[i].trim())) {
          i++; // skip closing :::
          break;
        }
        contentLines.push(lines[i]);
        i++;
      }

      const idx = expands.length;
      expands.push({
        index: idx,
        title,
        contentMarkdown: contentLines.join("\n").trim(),
      });
      result.push(`${EXPAND_PLACEHOLDER_PREFIX}${idx}`);
      continue;
    }

    result.push(line);
    i++;
  }

  return { markdown: result.join("\n"), expands };
}

/**
 * Replace expand placeholder paragraphs in an ADF document with Confluence expand nodes.
 */
export function injectExpandAdf(
  adf: AdfDocument,
  expands: ExpandBlock[],
): AdfDocument {
  const newContent: AdfNode[] = [];

  for (const node of adf.content) {
    const placeholderIdx = findPlaceholderIndex(node, EXPAND_PLACEHOLDER_PREFIX);
    if (placeholderIdx !== null) {
      const expand = expands.find((e) => e.index === placeholderIdx);
      if (expand) {
        const innerAdf = expand.contentMarkdown
          ? (markdownToAdf(expand.contentMarkdown) as AdfDocument)
          : { version: 1 as const, type: "doc" as const, content: [] };
        newContent.push({
          type: "expand",
          attrs: { title: expand.title },
          content: innerAdf.content,
        });
        continue;
      }
    }
    newContent.push(node);
  }

  return { ...adf, content: newContent };
}

/**
 * Find a numbered placeholder index in an ADF node tree.
 * Returns the index number if found, or null.
 */
function findPlaceholderIndex(node: AdfNode, prefix: string): number | null {
  if (node.text) {
    const regex = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)`);
    const match = node.text.match(regex);
    if (match) return parseInt(match[1], 10);
  }
  if (node.content) {
    for (const child of node.content) {
      const result = findPlaceholderIndex(child, prefix);
      if (result !== null) return result;
    }
  }
  return null;
}

/**
 * Convert a markdown string to an Atlassian Document Format (ADF) document.
 * Detects Table of Contents sections, GFM alert panels, and expand directives,
 * replacing them with the corresponding Confluence nodes.
 */
export function convertMarkdownToAdf(markdown: string): AdfDocument {
  // Pre-process: strip special sections
  const { markdown: afterToc, hasToc } = stripTocSection(markdown);
  const { markdown: afterPanels, panels } = stripPanelBlocks(afterToc);
  const { markdown: afterExpands, expands } = stripExpandBlocks(afterPanels);

  // Convert to ADF
  let adf = markdownToAdf(afterExpands) as AdfDocument;

  // Post-process: inject special nodes
  if (hasToc) adf = injectTocMacro(adf);
  if (panels.length > 0) adf = injectPanelAdf(adf, panels);
  if (expands.length > 0) adf = injectExpandAdf(adf, expands);

  return adf;
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
