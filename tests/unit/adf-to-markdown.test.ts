import { describe, it, expect } from "vitest";
import { adfToMarkdown } from "../../src/lib/adf-to-markdown.js";
import type { AdfDocument, AdfNode } from "../../src/lib/types.js";

/**
 * Helper to build a minimal ADF document with the given top-level nodes.
 */
function doc(...content: AdfNode[]): AdfDocument {
  return { version: 1, type: "doc", content };
}

describe("adfToMarkdown", () => {
  describe("headings", () => {
    it("converts heading level 1", () => {
      const result = adfToMarkdown(
        doc({
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        }),
      );
      expect(result).toBe("# Title\n");
    });

    it("converts heading level 2", () => {
      const result = adfToMarkdown(
        doc({
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Subtitle" }],
        }),
      );
      expect(result).toBe("## Subtitle\n");
    });

    it("converts heading level 3", () => {
      const result = adfToMarkdown(
        doc({
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Section" }],
        }),
      );
      expect(result).toBe("### Section\n");
    });

    it("converts heading level 4", () => {
      const result = adfToMarkdown(
        doc({
          type: "heading",
          attrs: { level: 4 },
          content: [{ type: "text", text: "Subsection" }],
        }),
      );
      expect(result).toBe("#### Subsection\n");
    });

    it("converts heading level 5", () => {
      const result = adfToMarkdown(
        doc({
          type: "heading",
          attrs: { level: 5 },
          content: [{ type: "text", text: "Minor" }],
        }),
      );
      expect(result).toBe("##### Minor\n");
    });

    it("converts heading level 6", () => {
      const result = adfToMarkdown(
        doc({
          type: "heading",
          attrs: { level: 6 },
          content: [{ type: "text", text: "Deep" }],
        }),
      );
      expect(result).toBe("###### Deep\n");
    });

    it("defaults to level 1 when no level attribute is present", () => {
      const result = adfToMarkdown(
        doc({
          type: "heading",
          content: [{ type: "text", text: "No Level" }],
        }),
      );
      expect(result).toBe("# No Level\n");
    });
  });

  describe("paragraph", () => {
    it("converts a simple paragraph", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        }),
      );
      expect(result).toBe("Hello world\n");
    });

    it("concatenates multiple text nodes in a paragraph", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world" },
          ],
        }),
      );
      expect(result).toBe("Hello world\n");
    });

    it("handles paragraph with no content", () => {
      const result = adfToMarkdown(
        doc({ type: "paragraph" }),
      );
      expect(result).toBe("\n");
    });
  });

  describe("bulletList", () => {
    it("converts a simple bullet list", () => {
      const result = adfToMarkdown(
        doc({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Item one" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Item two" }] },
              ],
            },
          ],
        }),
      );
      expect(result).toBe("- Item one\n- Item two\n");
    });

    it("handles nested bullet lists", () => {
      const result = adfToMarkdown(
        doc({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Parent" }] },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        { type: "paragraph", content: [{ type: "text", text: "Child" }] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      );
      expect(result).toContain("- Parent");
      expect(result).toContain("  - Child");
    });

    it("handles empty bullet list", () => {
      const result = adfToMarkdown(
        doc({ type: "bulletList" }),
      );
      expect(result).toBe("\n");
    });
  });

  describe("orderedList", () => {
    it("converts an ordered list with numbered items", () => {
      const result = adfToMarkdown(
        doc({
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "First" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Second" }] },
              ],
            },
          ],
        }),
      );
      expect(result).toContain("1. First");
      expect(result).toContain("2. Second");
    });

    it("handles nested ordered lists", () => {
      const result = adfToMarkdown(
        doc({
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Parent" }] },
                {
                  type: "orderedList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        { type: "paragraph", content: [{ type: "text", text: "Child" }] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      );
      expect(result).toContain("1. Parent");
      expect(result).toContain("  1. Child");
    });
  });

  describe("codeBlock", () => {
    it("converts a code block with language", () => {
      const result = adfToMarkdown(
        doc({
          type: "codeBlock",
          attrs: { language: "typescript" },
          content: [{ type: "text", text: "const x = 1;" }],
        }),
      );
      expect(result).toBe("```typescript\nconst x = 1;\n```\n");
    });

    it("converts a code block without language", () => {
      const result = adfToMarkdown(
        doc({
          type: "codeBlock",
          content: [{ type: "text", text: "plain code" }],
        }),
      );
      expect(result).toBe("```\nplain code\n```\n");
    });

    it("handles empty code block", () => {
      const result = adfToMarkdown(
        doc({ type: "codeBlock", attrs: { language: "js" } }),
      );
      expect(result).toBe("```js\n\n```\n");
    });
  });

  describe("blockquote", () => {
    it("converts a blockquote with a paragraph", () => {
      const result = adfToMarkdown(
        doc({
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quoted text" }],
            },
          ],
        }),
      );
      expect(result).toBe("> Quoted text\n");
    });

    it("converts blockquote with multiple paragraphs", () => {
      const result = adfToMarkdown(
        doc({
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "First paragraph" }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Second paragraph" }],
            },
          ],
        }),
      );
      expect(result).toContain("> First paragraph");
      expect(result).toContain("> Second paragraph");
    });

    it("handles empty blockquote", () => {
      const result = adfToMarkdown(
        doc({ type: "blockquote" }),
      );
      expect(result).toBe(">\n");
    });
  });

  describe("table", () => {
    it("converts a table with header row", () => {
      const result = adfToMarkdown(
        doc({
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "Name" }] },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "Value" }] },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "foo" }] },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "bar" }] },
                  ],
                },
              ],
            },
          ],
        }),
      );
      expect(result).toContain("| Name | Value |");
      expect(result).toContain("| --- | --- |");
      expect(result).toContain("| foo | bar |");
    });

    it("converts a table without header cells", () => {
      const result = adfToMarkdown(
        doc({
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "a" }] },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "b" }] },
                  ],
                },
              ],
            },
          ],
        }),
      );
      expect(result).toContain("| a | b |");
      expect(result).toContain("| --- | --- |");
    });

    it("handles empty table", () => {
      const result = adfToMarkdown(
        doc({ type: "table" }),
      );
      expect(result).toBe("\n");
    });

    it("escapes pipe characters in cell content", () => {
      const result = adfToMarkdown(
        doc({
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "a|b" }] },
                  ],
                },
              ],
            },
          ],
        }),
      );
      expect(result).toContain("a\\|b");
    });
  });

  describe("rule", () => {
    it("converts a horizontal rule", () => {
      const result = adfToMarkdown(
        doc({ type: "rule" }),
      );
      expect(result).toBe("---\n");
    });
  });

  describe("mediaSingle", () => {
    it("converts media with URL", () => {
      const result = adfToMarkdown(
        doc({
          type: "mediaSingle",
          content: [
            {
              type: "media",
              attrs: { alt: "screenshot", url: "https://example.com/img.png" },
            },
          ],
        }),
      );
      expect(result).toBe("![screenshot](https://example.com/img.png)\n");
    });

    it("converts file-type media with attachment ID", () => {
      const result = adfToMarkdown(
        doc({
          type: "mediaSingle",
          content: [
            {
              type: "media",
              attrs: { alt: "diagram", id: "abc-123" },
            },
          ],
        }),
      );
      expect(result).toBe("![diagram](attachment:abc-123)\n");
    });

    it("uses default alt text when none provided", () => {
      const result = adfToMarkdown(
        doc({
          type: "mediaSingle",
          content: [
            {
              type: "media",
              attrs: { url: "https://example.com/img.png" },
            },
          ],
        }),
      );
      expect(result).toContain("![image]");
    });

    it("handles empty mediaSingle node", () => {
      const result = adfToMarkdown(
        doc({ type: "mediaSingle" }),
      );
      expect(result).toBe("\n");
    });

    it("handles mediaSingle with no media child", () => {
      const result = adfToMarkdown(
        doc({
          type: "mediaSingle",
          content: [{ type: "paragraph", content: [{ type: "text", text: "not media" }] }],
        }),
      );
      expect(result).toBe("\n");
    });
  });

  describe("panel", () => {
    it("converts info panel to NOTE alert", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          attrs: { panelType: "info" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Info content" }] },
          ],
        }),
      );
      expect(result).toContain("> [!NOTE]");
      expect(result).toContain("> Info content");
    });

    it("converts success panel to TIP alert", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          attrs: { panelType: "success" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Tip content" }] },
          ],
        }),
      );
      expect(result).toContain("> [!TIP]");
    });

    it("converts note panel to IMPORTANT alert", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          attrs: { panelType: "note" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Important" }] },
          ],
        }),
      );
      expect(result).toContain("> [!IMPORTANT]");
    });

    it("converts warning panel to WARNING alert", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          attrs: { panelType: "warning" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Warning" }] },
          ],
        }),
      );
      expect(result).toContain("> [!WARNING]");
    });

    it("converts error panel to CAUTION alert", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          attrs: { panelType: "error" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Caution" }] },
          ],
        }),
      );
      expect(result).toContain("> [!CAUTION]");
    });

    it("handles empty panel", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          attrs: { panelType: "info" },
        }),
      );
      expect(result).toContain("> [!NOTE]");
    });

    it("handles multi-paragraph panel", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          attrs: { panelType: "info" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "First" }] },
            { type: "paragraph", content: [{ type: "text", text: "Second" }] },
          ],
        }),
      );
      expect(result).toContain("> [!NOTE]");
      expect(result).toContain("> First");
      expect(result).toContain("> Second");
    });

    it("handles formatted content inside panel", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          attrs: { panelType: "success" },
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "bold text", marks: [{ type: "strong" }] },
              ],
            },
          ],
        }),
      );
      expect(result).toContain("> [!TIP]");
      expect(result).toContain("> **bold text**");
    });

    it("defaults to NOTE when panelType is missing", () => {
      const result = adfToMarkdown(
        doc({
          type: "panel",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Default" }] },
          ],
        }),
      );
      expect(result).toContain("> [!NOTE]");
    });
  });

  describe("expand", () => {
    it("converts an expand node with title and content", () => {
      const result = adfToMarkdown(
        doc({
          type: "expand",
          attrs: { title: "Click to expand" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hidden content" }],
            },
          ],
        }),
      );
      expect(result).toContain(":::expand Click to expand");
      expect(result).toContain("Hidden content");
      expect(result).toContain(":::");
    });

    it("uses default title when none provided", () => {
      const result = adfToMarkdown(
        doc({
          type: "expand",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Content" }],
            },
          ],
        }),
      );
      expect(result).toContain(":::expand Details");
    });

    it("handles expand with no content", () => {
      const result = adfToMarkdown(
        doc({
          type: "expand",
          attrs: { title: "Empty" },
        }),
      );
      expect(result).toContain(":::expand Empty");
      expect(result).toContain(":::");
    });
  });

  describe("extension", () => {
    it("converts an extension node to an HTML comment", () => {
      const result = adfToMarkdown(
        doc({
          type: "extension",
          attrs: { extensionKey: "toc" },
        }),
      );
      expect(result).toBe("<!-- confluence:toc -->\n");
    });

    it("uses unknown key when extensionKey is missing", () => {
      const result = adfToMarkdown(
        doc({ type: "extension" }),
      );
      expect(result).toBe("<!-- confluence:unknown -->\n");
    });
  });

  describe("inline marks", () => {
    it("applies strong (bold) mark", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            { type: "text", text: "bold text", marks: [{ type: "strong" }] },
          ],
        }),
      );
      expect(result).toBe("**bold text**\n");
    });

    it("applies em (italic) mark", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            { type: "text", text: "italic text", marks: [{ type: "em" }] },
          ],
        }),
      );
      expect(result).toBe("*italic text*\n");
    });

    it("applies code mark", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            { type: "text", text: "code text", marks: [{ type: "code" }] },
          ],
        }),
      );
      expect(result).toBe("`code text`\n");
    });

    it("applies strike mark", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            { type: "text", text: "deleted", marks: [{ type: "strike" }] },
          ],
        }),
      );
      expect(result).toBe("~~deleted~~\n");
    });

    it("applies link mark", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click here",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        }),
      );
      expect(result).toBe("[click here](https://example.com)\n");
    });

    it("applies combined strong and em marks", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "both",
              marks: [{ type: "strong" }, { type: "em" }],
            },
          ],
        }),
      );
      expect(result).toBe("***both***\n");
    });

    it("applies combined strong, em, and strike marks", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "all",
              marks: [{ type: "strong" }, { type: "em" }, { type: "strike" }],
            },
          ],
        }),
      );
      expect(result).toContain("**");
      expect(result).toContain("*");
      expect(result).toContain("~~");
    });

    it("handles text with no marks", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [{ type: "text", text: "plain", marks: [] }],
        }),
      );
      expect(result).toBe("plain\n");
    });

    it("handles link mark without href", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "no link",
              marks: [{ type: "link" }],
            },
          ],
        }),
      );
      expect(result).toBe("no link\n");
    });
  });

  describe("hardBreak", () => {
    it("converts hardBreak to newline", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            { type: "text", text: "line one" },
            { type: "hardBreak" },
            { type: "text", text: "line two" },
          ],
        }),
      );
      expect(result).toBe("line one\nline two\n");
    });
  });

  describe("inlineCard", () => {
    it("converts inlineCard with URL", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            { type: "inlineCard", attrs: { url: "https://example.com/page" } },
          ],
        }),
      );
      expect(result).toBe("<https://example.com/page>\n");
    });

    it("handles inlineCard without URL", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [
            { type: "inlineCard", attrs: {} },
          ],
        }),
      );
      expect(result).toBe("\n");
    });
  });

  describe("nested structures", () => {
    it("handles a document with mixed content types", () => {
      const result = adfToMarkdown(
        doc(
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Title" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Intro text" }],
          },
          { type: "rule" },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  { type: "paragraph", content: [{ type: "text", text: "Item" }] },
                ],
              },
            ],
          },
        ),
      );
      expect(result).toContain("# Title");
      expect(result).toContain("Intro text");
      expect(result).toContain("---");
      expect(result).toContain("- Item");
    });

    it("handles blockquote containing a nested list", () => {
      const result = adfToMarkdown(
        doc({
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quote with list:" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "nested item" }] },
                  ],
                },
              ],
            },
          ],
        }),
      );
      expect(result).toContain("> Quote with list:");
      expect(result).toContain("> - nested item");
    });
  });

  describe("empty/missing content", () => {
    it("handles empty document", () => {
      const result = adfToMarkdown({ version: 1, type: "doc", content: [] });
      expect(result).toBe("\n");
    });

    it("handles text node with missing text property", () => {
      const result = adfToMarkdown(
        doc({
          type: "paragraph",
          content: [{ type: "text" }],
        }),
      );
      expect(result).toBe("\n");
    });

    it("handles list item with no content", () => {
      const result = adfToMarkdown(
        doc({
          type: "bulletList",
          content: [
            { type: "listItem" },
          ],
        }),
      );
      expect(result).toContain("-");
    });

    it("handles unknown node type gracefully", () => {
      const result = adfToMarkdown(
        doc({
          type: "unknownNode",
          content: [{ type: "text", text: "fallback text" }],
        }),
      );
      expect(result).toContain("fallback text");
    });
  });
});
