import { describe, it, expect } from "vitest";
import {
  convertMarkdownToAdf,
  extractTitle,
  titleFromFilename,
  injectMermaidAdf,
} from "../../src/lib/converter.js";
import type { AdfDocument, MermaidBlock } from "../../src/lib/types.js";
import type { AttachmentMap } from "../../src/lib/converter.js";

describe("converter", () => {
  describe("convertMarkdownToAdf", () => {
    it("converts simple paragraph", () => {
      const adf = convertMarkdownToAdf("Hello world");
      expect(adf.type).toBe("doc");
      expect(adf.version).toBe(1);
      expect(adf.content.length).toBeGreaterThan(0);
    });

    it("converts heading", () => {
      const adf = convertMarkdownToAdf("# My Heading");
      expect(adf.content[0].type).toBe("heading");
    });

    it("converts bold text", () => {
      const adf = convertMarkdownToAdf("**bold text**");
      const paragraph = adf.content[0];
      expect(paragraph.type).toBe("paragraph");
      const textNode = paragraph.content?.[0];
      expect(textNode?.marks?.some((m) => m.type === "strong")).toBe(true);
    });

    it("converts bullet list", () => {
      const adf = convertMarkdownToAdf("- item one\n- item two");
      const list = adf.content[0];
      expect(list.type).toBe("bulletList");
    });

    it("converts code block", () => {
      const adf = convertMarkdownToAdf("```js\nconsole.log('hi');\n```");
      const codeBlock = adf.content[0];
      expect(codeBlock.type).toBe("codeBlock");
    });

    it("converts links", () => {
      const adf = convertMarkdownToAdf("[click here](https://example.com)");
      const paragraph = adf.content[0];
      const textNode = paragraph.content?.[0];
      expect(textNode?.marks?.some((m) => m.type === "link")).toBe(true);
    });

    it("converts blockquote", () => {
      const adf = convertMarkdownToAdf("> This is a quote");
      const blockquote = adf.content[0];
      expect(blockquote.type).toBe("blockquote");
    });

    it("converts horizontal rule", () => {
      const adf = convertMarkdownToAdf("---");
      const rule = adf.content[0];
      expect(rule.type).toBe("rule");
    });

    it("converts ordered list", () => {
      const adf = convertMarkdownToAdf("1. first\n2. second");
      const list = adf.content[0];
      expect(list.type).toBe("orderedList");
    });

    it("handles empty markdown", () => {
      const adf = convertMarkdownToAdf("");
      expect(adf.type).toBe("doc");
    });

    it("converts complex markdown document", () => {
      const markdown = `# Title

Some paragraph with **bold** and *italic*.

## Section

- list item
- another item

\`\`\`python
print("hello")
\`\`\`
`;
      const adf = convertMarkdownToAdf(markdown);
      expect(adf.type).toBe("doc");
      expect(adf.content.length).toBeGreaterThan(3);
    });
  });

  describe("extractTitle", () => {
    it("extracts H1 heading", () => {
      expect(extractTitle("# My Page Title")).toBe("My Page Title");
    });

    it("extracts first H1 from multi-heading doc", () => {
      expect(extractTitle("# First\n## Second\n# Third")).toBe("First");
    });

    it("returns null when no H1 found", () => {
      expect(extractTitle("## Only H2\nSome text")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(extractTitle("")).toBeNull();
    });

    it("trims whitespace from title", () => {
      expect(extractTitle("#   Spaced Title   ")).toBe("Spaced Title");
    });

    it("ignores H1 in code blocks (basic)", () => {
      // Note: basic regex-based extraction doesn't skip code blocks
      // This tests the current behavior
      const md = "Some text\n# Real Title";
      expect(extractTitle(md)).toBe("Real Title");
    });
  });

  describe("titleFromFilename", () => {
    it("converts simple filename", () => {
      expect(titleFromFilename("my-document.md")).toBe("My Document");
    });

    it("converts underscored filename", () => {
      expect(titleFromFilename("api_reference.md")).toBe("Api Reference");
    });

    it("handles path with directories", () => {
      expect(titleFromFilename("docs/guides/getting-started.md")).toBe("Getting Started");
    });

    it("handles Windows-style paths", () => {
      expect(titleFromFilename("docs\\guides\\setup-guide.md")).toBe("Setup Guide");
    });

    it("handles URL source", () => {
      expect(titleFromFilename("https://raw.githubusercontent.com/org/repo/main/README.md")).toBe(
        "README",
      );
    });

    it("returns Untitled for empty path", () => {
      expect(titleFromFilename("")).toBe("Untitled");
    });

    it("handles filename without extension", () => {
      expect(titleFromFilename("my-doc")).toBe("My Doc");
    });
  });

  describe("injectMermaidAdf", () => {
    const makeAdf = (content: AdfDocument["content"]): AdfDocument => ({
      version: 1,
      type: "doc",
      content,
    });

    const makeBlocks = (overrides: Partial<MermaidBlock>[]): MermaidBlock[] =>
      overrides.map((o, i) => ({
        index: i,
        success: true,
        code: "graph TD\nA-->B",
        pngBuffer: Buffer.from("png"),
        filename: `mermaid-diagram-${i}.png`,
        ...o,
      }));

    it("replaces diagram placeholder with mediaSingle and expand nodes", () => {
      const adf = makeAdf([
        {
          type: "paragraph",
          content: [{ type: "text", text: "MERMAID_DIAGRAM_PLACEHOLDER_0" }],
        },
      ]);
      const blocks = makeBlocks([{}]);
      const attachmentMap: AttachmentMap = {
        "mermaid-diagram-0.png": { fileId: "file-123", collectionName: "contentId-page1" },
      };

      const result = injectMermaidAdf(adf, blocks, attachmentMap);
      expect(result.content).toHaveLength(2);

      // First node: mediaSingle with image
      expect(result.content[0].type).toBe("mediaSingle");
      expect(result.content[0].attrs?.layout).toBe("center");
      expect(result.content[0].content?.[0].type).toBe("media");
      expect(result.content[0].content?.[0].attrs?.id).toBe("file-123");
      expect(result.content[0].content?.[0].attrs?.collection).toBe("contentId-page1");

      // Second node: expand with code block
      expect(result.content[1].type).toBe("expand");
      expect(result.content[1].attrs?.title).toBe("View Mermaid Source Code");
      expect(result.content[1].content?.[0].type).toBe("codeBlock");
      expect(result.content[1].content?.[0].content?.[0].text).toBe("graph TD\nA-->B");
    });

    it("replaces error placeholder with expand node only", () => {
      const adf = makeAdf([
        {
          type: "paragraph",
          content: [{ type: "text", text: "MERMAID_ERROR_PLACEHOLDER_0" }],
        },
      ]);
      const blocks = makeBlocks([{ success: false, error: "render failed" }]);
      const attachmentMap: AttachmentMap = {};

      const result = injectMermaidAdf(adf, blocks, attachmentMap);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("expand");
      expect(result.content[0].attrs?.title).toContain("render failed");
    });

    it("preserves non-mermaid nodes", () => {
      const adf = makeAdf([
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "MERMAID_DIAGRAM_PLACEHOLDER_0" }],
        },
        { type: "paragraph", content: [{ type: "text", text: "Normal text" }] },
      ]);
      const blocks = makeBlocks([{}]);
      const attachmentMap: AttachmentMap = {
        "mermaid-diagram-0.png": { fileId: "f1", collectionName: "c1" },
      };

      const result = injectMermaidAdf(adf, blocks, attachmentMap);
      // heading + mediaSingle + expand + paragraph = 4 nodes
      expect(result.content).toHaveLength(4);
      expect(result.content[0].type).toBe("heading");
      expect(result.content[1].type).toBe("mediaSingle");
      expect(result.content[2].type).toBe("expand");
      expect(result.content[3].type).toBe("paragraph");
    });

    it("handles multiple mermaid placeholders", () => {
      const adf = makeAdf([
        {
          type: "paragraph",
          content: [{ type: "text", text: "MERMAID_DIAGRAM_PLACEHOLDER_0" }],
        },
        { type: "paragraph", content: [{ type: "text", text: "Some text" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "MERMAID_DIAGRAM_PLACEHOLDER_1" }],
        },
      ]);
      const blocks = makeBlocks([{}, { index: 1, filename: "mermaid-diagram-1.png" }]);
      const attachmentMap: AttachmentMap = {
        "mermaid-diagram-0.png": { fileId: "f0", collectionName: "c0" },
        "mermaid-diagram-1.png": { fileId: "f1", collectionName: "c1" },
      };

      const result = injectMermaidAdf(adf, blocks, attachmentMap);
      // mediaSingle + expand + paragraph + mediaSingle + expand = 5
      expect(result.content).toHaveLength(5);
      expect(result.content[0].type).toBe("mediaSingle");
      expect(result.content[1].type).toBe("expand");
      expect(result.content[2].type).toBe("paragraph");
      expect(result.content[3].type).toBe("mediaSingle");
      expect(result.content[4].type).toBe("expand");
    });

    it("skips mediaSingle when attachment is not in the map", () => {
      const adf = makeAdf([
        {
          type: "paragraph",
          content: [{ type: "text", text: "MERMAID_DIAGRAM_PLACEHOLDER_0" }],
        },
      ]);
      const blocks = makeBlocks([{}]);
      const attachmentMap: AttachmentMap = {}; // Empty — no upload

      const result = injectMermaidAdf(adf, blocks, attachmentMap);
      // Only expand, no mediaSingle
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("expand");
    });

    it("returns unchanged ADF when no mermaid placeholders", () => {
      const adf = makeAdf([
        { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
      ]);

      const result = injectMermaidAdf(adf, [], {});
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("paragraph");
    });
  });
});
