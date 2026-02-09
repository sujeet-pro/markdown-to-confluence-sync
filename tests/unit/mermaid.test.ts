import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));

vi.mock("node:os", () => ({
  default: {
    tmpdir: vi.fn(() => "/tmp"),
  },
}));

import fs from "node:fs";
import { execSync } from "node:child_process";
import {
  findMmdc,
  renderMermaidToPng,
  hasMermaidBlocks,
  processMermaidBlocks,
} from "../../src/lib/mermaid.js";

describe("mermaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("hasMermaidBlocks", () => {
    it("returns true when markdown contains mermaid blocks", () => {
      const md = "# Title\n\n```mermaid\ngraph TD\nA-->B\n```\n\nSome text";
      expect(hasMermaidBlocks(md)).toBe(true);
    });

    it("returns false when no mermaid blocks", () => {
      const md = "# Title\n\n```js\nconsole.log('hi');\n```\n";
      expect(hasMermaidBlocks(md)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(hasMermaidBlocks("")).toBe(false);
    });

    it("returns true for multiple mermaid blocks", () => {
      const md = "```mermaid\ngraph TD\n```\n\nText\n\n```mermaid\nsequenceDiagram\n```";
      expect(hasMermaidBlocks(md)).toBe(true);
    });
  });

  describe("findMmdc", () => {
    it("returns sibling mmdc path when it exists next to the running script", () => {
      // First existsSync call checks sibling to process.argv[1]
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      const result = findMmdc();
      expect(result).toContain("mmdc");
    });

    it("returns CWD node_modules mmdc when sibling not found", () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // sibling not found
        .mockReturnValueOnce(true); // CWD node_modules found
      const result = findMmdc();
      expect(result).toContain("node_modules/.bin/mmdc");
    });

    it("returns 'mmdc' when found in PATH", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue("11.0.0");
      const result = findMmdc();
      expect(result).toBe("mmdc");
    });

    it("returns null when mmdc is not available anywhere", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("Command not found");
      });
      const result = findMmdc();
      expect(result).toBeNull();
    });
  });

  describe("renderMermaidToPng", () => {
    it("renders mermaid code to PNG successfully", () => {
      const pngData = Buffer.from("fake-png-data");
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true) // tmpDir exists
        .mockReturnValueOnce(true) // outputFile exists after render
        .mockReturnValueOnce(true) // cleanup inputFile check
        .mockReturnValueOnce(true); // cleanup outputFile check
      vi.mocked(fs.readFileSync).mockReturnValue(pngData);

      const result = renderMermaidToPng("graph TD\nA-->B", 0, "/usr/bin/mmdc");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.pngBuffer).toEqual(pngData);
        expect(result.filename).toBe("mermaid-diagram-0.png");
      }
    });

    it("creates tmp directory if it does not exist", () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // tmpDir doesn't exist
        .mockReturnValueOnce(true) // outputFile exists
        .mockReturnValueOnce(true) // cleanup inputFile
        .mockReturnValueOnce(true); // cleanup outputFile
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("png"));

      renderMermaidToPng("graph TD\nA-->B", 0, "mmdc");
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining("md2cf-mermaid"), {
        recursive: true,
      });
    });

    it("returns error when PNG is not generated", () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true) // tmpDir
        .mockReturnValueOnce(false) // outputFile doesn't exist
        .mockReturnValueOnce(true) // cleanup inputFile
        .mockReturnValueOnce(false); // cleanup outputFile

      const result = renderMermaidToPng("invalid mermaid", 0, "mmdc");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("PNG file was not generated");
      }
    });

    it("returns error when execSync throws", () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true) // tmpDir
        .mockReturnValueOnce(true) // cleanup inputFile
        .mockReturnValueOnce(false); // cleanup outputFile
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("mmdc failed");
      });

      const result = renderMermaidToPng("bad code", 0, "mmdc");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("mmdc failed");
      }
    });

    it("cleans up temp files after success", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("png"));

      renderMermaidToPng("graph TD\nA-->B", 0, "mmdc");
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2); // input + output
    });

    it("handles cleanup errors silently", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("png"));
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error("Permission denied");
      });

      // Should not throw
      const result = renderMermaidToPng("graph TD\nA-->B", 0, "mmdc");
      expect(result.success).toBe(true);
    });
  });

  describe("processMermaidBlocks", () => {
    it("extracts mermaid blocks and replaces with placeholders", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("png-data"));

      const md = "# Title\n\n```mermaid\ngraph TD\nA-->B\n```\n\nMore text";
      const result = processMermaidBlocks(md, "mmdc");

      expect(result.markdown).toContain("MERMAID_DIAGRAM_PLACEHOLDER_0");
      expect(result.markdown).not.toContain("```mermaid");
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].success).toBe(true);
      expect(result.blocks[0].code).toBe("graph TD\nA-->B");
      expect(result.blocks[0].filename).toBe("mermaid-diagram-0.png");
    });

    it("handles multiple mermaid blocks", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("png-data"));

      const md =
        "```mermaid\ngraph TD\nA-->B\n```\n\nText\n\n```mermaid\nsequenceDiagram\nA->>B: msg\n```";
      const result = processMermaidBlocks(md, "mmdc");

      expect(result.markdown).toContain("MERMAID_DIAGRAM_PLACEHOLDER_0");
      expect(result.markdown).toContain("MERMAID_DIAGRAM_PLACEHOLDER_1");
      expect(result.blocks).toHaveLength(2);
    });

    it("uses error placeholder when render fails", () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true) // tmpDir
        .mockReturnValueOnce(false) // output file not generated
        .mockReturnValueOnce(true) // cleanup input
        .mockReturnValueOnce(false); // cleanup output
      vi.mocked(execSync).mockReturnValue("");

      const md = "```mermaid\nbad diagram\n```";
      const result = processMermaidBlocks(md, "mmdc");

      expect(result.markdown).toContain("MERMAID_ERROR_PLACEHOLDER_0");
      expect(result.blocks[0].success).toBe(false);
      expect(result.blocks[0].error).toBeDefined();
    });

    it("preserves non-mermaid content", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("png-data"));

      const md =
        "# Title\n\nSome text\n\n```mermaid\ngraph TD\n```\n\nMore text\n\n```js\ncode\n```";
      const result = processMermaidBlocks(md, "mmdc");

      expect(result.markdown).toContain("# Title");
      expect(result.markdown).toContain("Some text");
      expect(result.markdown).toContain("More text");
      expect(result.markdown).toContain("```js\ncode\n```");
    });

    it("returns empty blocks array when no mermaid blocks", () => {
      const md = "# No mermaid here\n\nJust text";
      const result = processMermaidBlocks(md, "mmdc");

      expect(result.markdown).toBe(md);
      expect(result.blocks).toHaveLength(0);
    });
  });
});
