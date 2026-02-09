import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isUrl,
  readLocalFile,
  fetchRemoteFile,
  readMarkdownSource,
  isDirectory,
  readFolderStructure,
} from "../../src/lib/markdown.js";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("markdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isUrl", () => {
    it("returns true for http URLs", () => {
      expect(isUrl("http://example.com/file.md")).toBe(true);
    });

    it("returns true for https URLs", () => {
      expect(isUrl("https://example.com/file.md")).toBe(true);
    });

    it("returns false for file paths", () => {
      expect(isUrl("./docs/file.md")).toBe(false);
    });

    it("returns false for absolute paths", () => {
      expect(isUrl("/home/user/file.md")).toBe(false);
    });

    it("returns false for Windows paths", () => {
      expect(isUrl("C:\\docs\\file.md")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isUrl("")).toBe(false);
    });

    it("returns false for random text", () => {
      expect(isUrl("just some text")).toBe(false);
    });

    it("returns false for ftp URLs", () => {
      expect(isUrl("ftp://example.com/file.md")).toBe(false);
    });
  });

  describe("readLocalFile", () => {
    it("reads a local file", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("# Hello");
      const content = readLocalFile("test.md");
      expect(content).toBe("# Hello");
    });

    it("throws when file does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(() => readLocalFile("nonexistent.md")).toThrow("File not found");
    });
  });

  describe("fetchRemoteFile", () => {
    it("fetches content from URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue("# Remote Content"),
      });
      const content = await fetchRemoteFile("https://example.com/file.md");
      expect(content).toBe("# Remote Content");
    });

    it("throws on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
      await expect(fetchRemoteFile("https://example.com/missing.md")).rejects.toThrow(
        "Failed to fetch",
      );
    });
  });

  describe("readMarkdownSource", () => {
    it("reads from local file for paths", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("# Local File");
      const content = await readMarkdownSource("./test.md");
      expect(content).toBe("# Local File");
    });

    it("fetches from URL for http sources", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue("# Remote File"),
      });
      const content = await readMarkdownSource("https://example.com/file.md");
      expect(content).toBe("# Remote File");
    });
  });

  describe("isDirectory", () => {
    it("returns true for directories", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      expect(isDirectory("/some/dir")).toBe(true);
    });

    it("returns false for files", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => false } as ReturnType<
        typeof statSync
      >);
      expect(isDirectory("/some/file.md")).toBe(false);
    });

    it("returns false when path does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      expect(isDirectory("/nonexistent")).toBe(false);
    });
  });

  describe("readFolderStructure", () => {
    it("reads flat folder with markdown files", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      vi.mocked(readdirSync).mockReturnValue([
        { name: "readme.md", isDirectory: () => false, isFile: () => true },
        { name: "guide.md", isDirectory: () => false, isFile: () => true },
        { name: "image.png", isDirectory: () => false, isFile: () => true },
      ] as unknown as ReturnType<typeof readdirSync>);

      const result = readFolderStructure("/docs");
      expect(result.name).toBe("docs");
      expect(result.files).toHaveLength(3);
      expect(result.files.filter((f) => f.isMarkdown)).toHaveLength(2);
      expect(result.subfolders).toHaveLength(0);
    });

    it("skips hidden directories", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      vi.mocked(readdirSync).mockReturnValue([
        { name: ".git", isDirectory: () => true, isFile: () => false },
        { name: "node_modules", isDirectory: () => true, isFile: () => false },
        { name: "doc.md", isDirectory: () => false, isFile: () => true },
      ] as unknown as ReturnType<typeof readdirSync>);

      const result = readFolderStructure("/project");
      expect(result.subfolders).toHaveLength(0);
      expect(result.files).toHaveLength(1);
    });

    it("throws when folder does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(() => readFolderStructure("/nonexistent")).toThrow("Folder not found");
    });

    it("throws when path is not a directory", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => false } as ReturnType<
        typeof statSync
      >);
      expect(() => readFolderStructure("/file.md")).toThrow("Not a directory");
    });

    it("recognizes .markdown extension", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      vi.mocked(readdirSync).mockReturnValue([
        { name: "doc.markdown", isDirectory: () => false, isFile: () => true },
      ] as unknown as ReturnType<typeof readdirSync>);

      const result = readFolderStructure("/docs");
      expect(result.files[0].isMarkdown).toBe(true);
    });
  });
});
