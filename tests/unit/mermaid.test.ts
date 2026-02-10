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

vi.mock("node:url", () => ({
  fileURLToPath: vi.fn(() => "/pkg/dist/lib/mermaid.js"),
}));

import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
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
    it("returns package-relative mmdc when found via import.meta.url", () => {
      // fileURLToPath returns /pkg/dist/lib/mermaid.js
      // Walking up: /pkg/dist/lib, /pkg/dist, /pkg — check node_modules/.bin/mmdc at each
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // /pkg/dist/lib/node_modules/.bin/mmdc
        .mockReturnValueOnce(false) // /pkg/dist/node_modules/.bin/mmdc
        .mockReturnValueOnce(true); // /pkg/node_modules/.bin/mmdc ✓
      const result = findMmdc();
      expect(result).toBe("/pkg/node_modules/.bin/mmdc");
    });

    it("returns sibling mmdc path when package-relative not found", () => {
      // All package-relative checks fail (5 iterations max)
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // /pkg/dist/lib/node_modules/.bin/mmdc
        .mockReturnValueOnce(false) // /pkg/dist/node_modules/.bin/mmdc
        .mockReturnValueOnce(false) // /pkg/node_modules/.bin/mmdc
        .mockReturnValueOnce(false) // /node_modules/.bin/mmdc
        .mockReturnValueOnce(true); // sibling to argv[1] ✓
      const result = findMmdc();
      expect(result).toContain("mmdc");
    });

    it("returns CWD node_modules mmdc when earlier checks fail", () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // pkg /dist/lib
        .mockReturnValueOnce(false) // pkg /dist
        .mockReturnValueOnce(false) // pkg /
        .mockReturnValueOnce(false) // pkg root
        .mockReturnValueOnce(false) // sibling not found
        .mockReturnValueOnce(true); // CWD node_modules ✓
      const result = findMmdc();
      expect(result).toContain("node_modules/.bin/mmdc");
    });

    it("returns global npm prefix mmdc when earlier checks fail", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      // First execSync call is `npm prefix -g`
      vi.mocked(execSync).mockReturnValueOnce("/usr/local\n");
      // After npm prefix, existsSync is called for lib/ and direct paths
      vi.mocked(fs.existsSync)
        .mockReturnValue(false) // package-relative and sibling and CWD
        .mockImplementation((p) => {
          return p === "/usr/local/lib/node_modules/.bin/mmdc";
        });
      const result = findMmdc();
      expect(result).toBe("/usr/local/lib/node_modules/.bin/mmdc");
    });

    it("returns 'mmdc' when found in PATH", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      // First call: npm prefix -g (fails), second call: mmdc --version (succeeds)
      vi.mocked(execSync)
        .mockImplementationOnce(() => {
          throw new Error("npm not found");
        })
        .mockReturnValueOnce("11.0.0");
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

    it("skips package-relative check when fileURLToPath throws", () => {
      vi.mocked(fileURLToPath).mockImplementation(() => {
        throw new Error("import.meta.url not available");
      });
      // Should fall through to sibling check
      vi.mocked(fs.existsSync).mockReturnValueOnce(true); // sibling ✓
      const result = findMmdc();
      expect(result).toContain("mmdc");
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
