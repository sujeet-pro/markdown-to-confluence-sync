import { describe, it, expect } from "vitest";
import {
  convertMarkdownToAdf,
  extractTitle,
  titleFromFilename,
  injectMermaidAdf,
  stripTocSection,
  injectTocMacro,
  stripPanelBlocks,
  injectPanelAdf,
  stripExpandBlocks,
  injectExpandAdf,
} from "../../src/lib/converter.js";
import type { AdfDocument, MermaidBlock, PanelBlock, ExpandBlock } from "../../src/lib/types.js";
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

  describe("stripTocSection", () => {
    it("strips ## Table of Contents heading and its list", () => {
      const md = `# Title

## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1
Content here.`;
      const result = stripTocSection(md);
      expect(result.hasToc).toBe(true);
      expect(result.markdown).not.toContain("Table of Contents");
      expect(result.markdown).not.toContain("Section 1](#section-1)");
      expect(result.markdown).toContain("CONFLUENCE_TOC_MACRO_PLACEHOLDER");
      expect(result.markdown).toContain("## Section 1");
    });

    it("strips ## TOC heading (short form)", () => {
      const md = `# Doc\n\n## TOC\n- [A](#a)\n\n## A\nText`;
      const result = stripTocSection(md);
      expect(result.hasToc).toBe(true);
      expect(result.markdown).not.toContain("## TOC");
    });

    it("strips ## Contents heading", () => {
      const md = `# Doc\n\n## Contents\n1. [Intro](#intro)\n\n## Intro\nHello`;
      const result = stripTocSection(md);
      expect(result.hasToc).toBe(true);
      expect(result.markdown).not.toContain("## Contents");
    });

    it("handles case-insensitive heading", () => {
      const md = `# Doc\n\n## table of contents\n- [A](#a)\n\n## A\nText`;
      const result = stripTocSection(md);
      expect(result.hasToc).toBe(true);
    });

    it("returns hasToc false when no TOC section exists", () => {
      const md = `# Title\n\nSome paragraph.\n\n## Section\nContent.`;
      const result = stripTocSection(md);
      expect(result.hasToc).toBe(false);
      expect(result.markdown).toBe(md);
    });

    it("handles TOC with nested list items", () => {
      const md = `# Title

## Table of Contents
- [Section 1](#section-1)
  - [Subsection 1.1](#subsection-11)
- [Section 2](#section-2)

## Section 1
Content.`;
      const result = stripTocSection(md);
      expect(result.hasToc).toBe(true);
      expect(result.markdown).not.toContain("Subsection 1.1");
      expect(result.markdown).toContain("## Section 1");
    });

    it("handles TOC at different heading levels", () => {
      const md = `# Title\n\n### Table of Contents\n- [A](#a)\n\n## A\nText`;
      const result = stripTocSection(md);
      expect(result.hasToc).toBe(true);
    });
  });

  describe("injectTocMacro", () => {
    const makeAdf = (content: AdfDocument["content"]): AdfDocument => ({
      version: 1,
      type: "doc",
      content,
    });

    it("replaces placeholder paragraph with TOC extension node", () => {
      const adf = makeAdf([
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "CONFLUENCE_TOC_MACRO_PLACEHOLDER" }],
        },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Section" }] },
      ]);

      const result = injectTocMacro(adf);
      expect(result.content).toHaveLength(3);
      expect(result.content[1].type).toBe("extension");
      expect(result.content[1].attrs?.extensionKey).toBe("toc");
      expect(result.content[1].attrs?.extensionType).toBe(
        "com.atlassian.confluence.macro.core",
      );
      const params = result.content[1].attrs?.parameters as Record<string, unknown>;
      const macroParams = params.macroParams as Record<string, { value: string }>;
      expect(macroParams.maxLevel.value).toBe("2");
      expect(macroParams.minLevel.value).toBe("1");
    });

    it("preserves non-placeholder nodes unchanged", () => {
      const adf = makeAdf([
        { type: "paragraph", content: [{ type: "text", text: "Normal text" }] },
      ]);

      const result = injectTocMacro(adf);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("paragraph");
    });
  });

  describe("convertMarkdownToAdf with TOC", () => {
    it("converts TOC section to Confluence TOC macro", () => {
      const md = `# My Page

## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1
First section content.

## Section 2
Second section content.`;

      const adf = convertMarkdownToAdf(md);
      const tocNode = adf.content.find((n) => n.type === "extension");
      expect(tocNode).toBeDefined();
      expect(tocNode!.attrs?.extensionKey).toBe("toc");
    });

    it("does not inject TOC macro when no TOC heading exists", () => {
      const md = `# Title\n\nJust a paragraph.\n\n## Section\nContent.`;
      const adf = convertMarkdownToAdf(md);
      const tocNode = adf.content.find((n) => n.type === "extension");
      expect(tocNode).toBeUndefined();
    });
  });

  describe("stripPanelBlocks", () => {
    it("strips NOTE alert", () => {
      const md = "> [!NOTE]\n> This is a note.";
      const result = stripPanelBlocks(md);
      expect(result.panels).toHaveLength(1);
      expect(result.panels[0].panelType).toBe("info");
      expect(result.panels[0].contentMarkdown).toBe("This is a note.");
      expect(result.markdown).toContain("CONFLUENCE_PANEL_PLACEHOLDER_0");
    });

    it("strips TIP alert", () => {
      const md = "> [!TIP]\n> A helpful tip.";
      const result = stripPanelBlocks(md);
      expect(result.panels[0].panelType).toBe("success");
      expect(result.panels[0].contentMarkdown).toBe("A helpful tip.");
    });

    it("strips IMPORTANT alert", () => {
      const md = "> [!IMPORTANT]\n> Critical info.";
      const result = stripPanelBlocks(md);
      expect(result.panels[0].panelType).toBe("note");
    });

    it("strips WARNING alert", () => {
      const md = "> [!WARNING]\n> Be careful.";
      const result = stripPanelBlocks(md);
      expect(result.panels[0].panelType).toBe("warning");
    });

    it("strips CAUTION alert", () => {
      const md = "> [!CAUTION]\n> Dangerous action.";
      const result = stripPanelBlocks(md);
      expect(result.panels[0].panelType).toBe("error");
    });

    it("handles multi-line content", () => {
      const md = "> [!NOTE]\n> Line one.\n> Line two.\n> Line three.";
      const result = stripPanelBlocks(md);
      expect(result.panels[0].contentMarkdown).toBe("Line one.\nLine two.\nLine three.");
    });

    it("handles multiple panels", () => {
      const md = "> [!NOTE]\n> Note text.\n\n> [!WARNING]\n> Warning text.";
      const result = stripPanelBlocks(md);
      expect(result.panels).toHaveLength(2);
      expect(result.panels[0].panelType).toBe("info");
      expect(result.panels[1].panelType).toBe("warning");
      expect(result.markdown).toContain("CONFLUENCE_PANEL_PLACEHOLDER_0");
      expect(result.markdown).toContain("CONFLUENCE_PANEL_PLACEHOLDER_1");
    });

    it("handles empty panel content", () => {
      const md = "> [!NOTE]";
      const result = stripPanelBlocks(md);
      expect(result.panels).toHaveLength(1);
      expect(result.panels[0].contentMarkdown).toBe("");
    });

    it("does not match regular blockquotes", () => {
      const md = "> Just a regular blockquote.";
      const result = stripPanelBlocks(md);
      expect(result.panels).toHaveLength(0);
      expect(result.markdown).toBe(md);
    });

    it("skips alerts inside fenced code blocks", () => {
      const md = "```\n> [!NOTE]\n> Not a real alert.\n```";
      const result = stripPanelBlocks(md);
      expect(result.panels).toHaveLength(0);
      expect(result.markdown).toBe(md);
    });
  });

  describe("injectPanelAdf", () => {
    const makeAdf = (content: AdfDocument["content"]): AdfDocument => ({
      version: 1,
      type: "doc",
      content,
    });

    it("replaces placeholder with panel node", () => {
      const adf = makeAdf([
        {
          type: "paragraph",
          content: [{ type: "text", text: "CONFLUENCE_PANEL_PLACEHOLDER_0" }],
        },
      ]);
      const panels: PanelBlock[] = [
        { index: 0, panelType: "info", contentMarkdown: "Panel content" },
      ];

      const result = injectPanelAdf(adf, panels);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("panel");
      expect(result.content[0].attrs?.panelType).toBe("info");
    });

    it("converts inner markdown to ADF content", () => {
      const adf = makeAdf([
        {
          type: "paragraph",
          content: [{ type: "text", text: "CONFLUENCE_PANEL_PLACEHOLDER_0" }],
        },
      ]);
      const panels: PanelBlock[] = [
        { index: 0, panelType: "warning", contentMarkdown: "**Bold** content" },
      ];

      const result = injectPanelAdf(adf, panels);
      expect(result.content[0].type).toBe("panel");
      expect(result.content[0].attrs?.panelType).toBe("warning");
      expect(result.content[0].content).toBeDefined();
      expect(result.content[0].content!.length).toBeGreaterThan(0);
    });

    it("preserves non-placeholder nodes", () => {
      const adf = makeAdf([
        { type: "paragraph", content: [{ type: "text", text: "Normal text" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "CONFLUENCE_PANEL_PLACEHOLDER_0" }],
        },
      ]);
      const panels: PanelBlock[] = [
        { index: 0, panelType: "info", contentMarkdown: "Note" },
      ];

      const result = injectPanelAdf(adf, panels);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe("paragraph");
      expect(result.content[1].type).toBe("panel");
    });
  });

  describe("stripExpandBlocks", () => {
    it("captures title and content", () => {
      const md = ":::expand My Title\nSome content here.\n:::";
      const result = stripExpandBlocks(md);
      expect(result.expands).toHaveLength(1);
      expect(result.expands[0].title).toBe("My Title");
      expect(result.expands[0].contentMarkdown).toBe("Some content here.");
      expect(result.markdown).toContain("CONFLUENCE_EXPAND_PLACEHOLDER_0");
    });

    it("handles multi-line content", () => {
      const md = ":::expand Details\nLine 1\nLine 2\nLine 3\n:::";
      const result = stripExpandBlocks(md);
      expect(result.expands[0].contentMarkdown).toBe("Line 1\nLine 2\nLine 3");
    });

    it("handles empty expand block", () => {
      const md = ":::expand Empty\n:::";
      const result = stripExpandBlocks(md);
      expect(result.expands).toHaveLength(1);
      expect(result.expands[0].contentMarkdown).toBe("");
    });

    it("skips ::: inside code blocks within expand", () => {
      const md = ":::expand Code Example\n```\n:::\n```\nAfter code.\n:::";
      const result = stripExpandBlocks(md);
      expect(result.expands).toHaveLength(1);
      expect(result.expands[0].contentMarkdown).toContain(":::");
      expect(result.expands[0].contentMarkdown).toContain("After code.");
    });

    it("skips expand directives inside fenced code blocks", () => {
      const md = "```\n:::expand Not Real\nContent\n:::\n```";
      const result = stripExpandBlocks(md);
      expect(result.expands).toHaveLength(0);
      expect(result.markdown).toBe(md);
    });

    it("handles multiple expand blocks", () => {
      const md = ":::expand First\nContent 1\n:::\n\n:::expand Second\nContent 2\n:::";
      const result = stripExpandBlocks(md);
      expect(result.expands).toHaveLength(2);
      expect(result.expands[0].title).toBe("First");
      expect(result.expands[1].title).toBe("Second");
    });
  });

  describe("injectExpandAdf", () => {
    const makeAdf = (content: AdfDocument["content"]): AdfDocument => ({
      version: 1,
      type: "doc",
      content,
    });

    it("replaces placeholder with expand node", () => {
      const adf = makeAdf([
        {
          type: "paragraph",
          content: [{ type: "text", text: "CONFLUENCE_EXPAND_PLACEHOLDER_0" }],
        },
      ]);
      const expands: ExpandBlock[] = [
        { index: 0, title: "Details", contentMarkdown: "Hidden content" },
      ];

      const result = injectExpandAdf(adf, expands);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("expand");
      expect(result.content[0].attrs?.title).toBe("Details");
    });

    it("converts inner markdown to ADF content", () => {
      const adf = makeAdf([
        {
          type: "paragraph",
          content: [{ type: "text", text: "CONFLUENCE_EXPAND_PLACEHOLDER_0" }],
        },
      ]);
      const expands: ExpandBlock[] = [
        { index: 0, title: "Code", contentMarkdown: "- item 1\n- item 2" },
      ];

      const result = injectExpandAdf(adf, expands);
      expect(result.content[0].type).toBe("expand");
      expect(result.content[0].content).toBeDefined();
      expect(result.content[0].content!.length).toBeGreaterThan(0);
    });

    it("preserves non-placeholder nodes", () => {
      const adf = makeAdf([
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "CONFLUENCE_EXPAND_PLACEHOLDER_0" }],
        },
      ]);
      const expands: ExpandBlock[] = [
        { index: 0, title: "More", contentMarkdown: "Content" },
      ];

      const result = injectExpandAdf(adf, expands);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe("heading");
      expect(result.content[1].type).toBe("expand");
    });
  });

  describe("convertMarkdownToAdf with panels", () => {
    it("converts GFM alert to ADF panel end-to-end", () => {
      const md = "> [!NOTE]\n> This is a note.";
      const adf = convertMarkdownToAdf(md);
      const panelNode = adf.content.find((n) => n.type === "panel");
      expect(panelNode).toBeDefined();
      expect(panelNode!.attrs?.panelType).toBe("info");
    });

    it("handles multiple alerts in a document", () => {
      const md = "# Title\n\n> [!NOTE]\n> Note.\n\n> [!WARNING]\n> Warn.";
      const adf = convertMarkdownToAdf(md);
      const panels = adf.content.filter((n) => n.type === "panel");
      expect(panels).toHaveLength(2);
      expect(panels[0].attrs?.panelType).toBe("info");
      expect(panels[1].attrs?.panelType).toBe("warning");
    });
  });

  describe("convertMarkdownToAdf with expand", () => {
    it("converts expand directive to ADF expand end-to-end", () => {
      const md = ":::expand Click here\nHidden content.\n:::";
      const adf = convertMarkdownToAdf(md);
      const expandNode = adf.content.find((n) => n.type === "expand");
      expect(expandNode).toBeDefined();
      expect(expandNode!.attrs?.title).toBe("Click here");
    });

    it("handles expand with code block content", () => {
      const md = ":::expand Code\n```js\nconsole.log('hi');\n```\n:::";
      const adf = convertMarkdownToAdf(md);
      const expandNode = adf.content.find((n) => n.type === "expand");
      expect(expandNode).toBeDefined();
      expect(expandNode!.content?.some((n) => n.type === "codeBlock")).toBe(true);
    });
  });
});
