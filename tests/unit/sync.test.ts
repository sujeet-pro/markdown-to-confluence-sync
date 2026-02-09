import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncAction } from "../../src/cli/commands/sync.js";

// Mock all dependencies
vi.mock("../../src/lib/config.js", () => ({
  getFullConfig: vi.fn(() => ({
    email: "test@example.com",
    token: "test-token",
    baseUrl: "https://test.atlassian.net",
  })),
}));

vi.mock("../../src/lib/markdown.js", () => ({
  readMarkdownSource: vi.fn(),
  isDirectory: vi.fn(() => false), // Default to false (single file)
  readFolderStructure: vi.fn(),
}));

vi.mock("../../src/lib/converter.js", () => ({
  convertMarkdownToAdf: vi.fn(() => ({ version: 1, type: "doc", content: [] })),
  extractTitle: vi.fn(() => "Test Title"),
  titleFromFilename: vi.fn(() => "Fallback Title"),
  injectMermaidAdf: vi.fn((adf: { version: number; type: string; content: unknown[] }) => adf),
}));

vi.mock("../../src/lib/confluence.js", () => {
  const mockClient = {
    checkAccess: vi.fn().mockResolvedValue(undefined),
    getPage: vi.fn(),
    getSpace: vi.fn(),
    findPageByTitle: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    getPageChildren: vi.fn(),
    getPageVersion: vi.fn(),
    uploadAttachment: vi.fn(),
  };
  return {
    ConfluenceClient: vi.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

vi.mock("../../src/lib/mermaid.js", () => ({
  hasMermaidBlocks: vi.fn(() => false),
  processMermaidBlocks: vi.fn(),
  findMmdc: vi.fn(),
}));

vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn(),
}));

vi.mock("ora", () => {
  const createSpinner = () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  });
  return { default: vi.fn(createSpinner) };
});

import { readMarkdownSource, isDirectory, readFolderStructure } from "../../src/lib/markdown.js";
import { extractTitle } from "../../src/lib/converter.js";
import { ConfluenceClient } from "../../src/lib/confluence.js";
import { confirm } from "@inquirer/prompts";
import { hasMermaidBlocks, processMermaidBlocks, findMmdc } from "../../src/lib/mermaid.js";

describe("sync command", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readMarkdownSource).mockResolvedValue("# Test\nContent here");
    vi.mocked(confirm).mockResolvedValue(true);
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Get mock client instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockClient = new (ConfluenceClient as any)();
  });

  describe("update existing page", () => {
    it("updates a page successfully", async () => {
      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Old Title",
        spaceId: "sp1",
        version: { number: 3 },
        _links: { webui: "/spaces/ENG/pages/12345" },
      });
      mockClient.updatePage.mockResolvedValue({
        id: "12345",
        title: "Test Title",
        spaceId: "sp1",
        _links: { webui: "/spaces/ENG/pages/12345" },
      });

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("updated");
      expect(result.pageId).toBe("12345");
    });

    it("increments version number", async () => {
      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Page",
        spaceId: "sp1",
        version: { number: 5 },
      });
      mockClient.updatePage.mockResolvedValue({
        id: "12345",
        title: "Test Title",
        spaceId: "sp1",
      });

      await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
      });

      expect(mockClient.updatePage).toHaveBeenCalledWith(
        "12345",
        "Test Title",
        expect.any(Object),
        6,
      );
    });

    it("uses custom title when provided", async () => {
      vi.mocked(extractTitle).mockReturnValue(null);
      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Page",
        spaceId: "sp1",
        version: { number: 1 },
      });
      mockClient.updatePage.mockResolvedValue({
        id: "12345",
        title: "Custom",
        spaceId: "sp1",
      });

      await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        title: "Custom",
      });

      expect(mockClient.updatePage).toHaveBeenCalledWith("12345", "Custom", expect.any(Object), 2);
    });

    it("throws when URL points to a space instead of a page", async () => {
      await expect(
        syncAction("test.md", { url: "https://test.atlassian.net/wiki/spaces/ENG" }),
      ).rejects.toThrow("URL must point to a specific page");
    });
  });

  describe("create new page (--create)", () => {
    it("creates a page in a space", async () => {
      mockClient.getSpace.mockResolvedValue({ id: "sp1", key: "ENG", name: "Engineering" });
      mockClient.createPage.mockResolvedValue({
        id: "999",
        title: "Test Title",
        spaceId: "sp1",
        _links: { webui: "/spaces/ENG/pages/999" },
      });

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG",
        create: true,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("created");
      expect(result.pageId).toBe("999");
      expect(mockClient.createPage).toHaveBeenCalledWith(
        "sp1",
        "Test Title",
        expect.any(Object),
        undefined,
      );
    });

    it("creates a page as child of another page", async () => {
      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Parent",
        spaceId: "sp1",
      });
      mockClient.createPage.mockResolvedValue({
        id: "501",
        title: "Test Title",
        spaceId: "sp1",
        _links: { webui: "/spaces/ENG/pages/501" },
      });

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        create: true,
      });

      expect(result.success).toBe(true);
      expect(mockClient.createPage).toHaveBeenCalledWith(
        "sp1",
        "Test Title",
        expect.any(Object),
        "12345",
      );
    });
  });

  describe("error cases", () => {
    it("throws when no URL is provided", async () => {
      await expect(syncAction("test.md", {})).rejects.toThrow("You must provide a Confluence URL");
    });

    it("propagates markdown read errors", async () => {
      vi.mocked(readMarkdownSource).mockRejectedValue(new Error("File not found"));
      await expect(
        syncAction("missing.md", { url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345" }),
      ).rejects.toThrow("File not found");
    });
  });

  describe("pre-flight access check", () => {
    it("throws when access check fails", async () => {
      mockClient.checkAccess.mockRejectedValue(new Error("Authentication failed"));
      await expect(
        syncAction("test.md", {
          url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        }),
      ).rejects.toThrow("Authentication failed");
    });
  });

  describe("overwrite protection", () => {
    it("cancels update when user declines confirmation", async () => {
      vi.mocked(confirm).mockResolvedValue(false);
      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Page",
        spaceId: "sp1",
        version: { number: 1 },
      });

      await expect(
        syncAction("test.md", {
          url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        }),
      ).rejects.toThrow("Update cancelled by user");
    });

    it("skips confirmation with --yes flag", async () => {
      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Page",
        spaceId: "sp1",
        version: { number: 1 },
      });
      mockClient.updatePage.mockResolvedValue({
        id: "12345",
        title: "Test Title",
        spaceId: "sp1",
      });

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        yes: true,
      });

      expect(result.success).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    });
  });

  describe("dry-run mode", () => {
    it("returns result without making API calls", async () => {
      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        dryRun: true,
      });
      expect(result.success).toBe(true);
      expect(result.action).toBe("updated");
      expect(mockClient.updatePage).not.toHaveBeenCalled();
      expect(mockClient.getPage).not.toHaveBeenCalled();
    });

    it("reports create action when --create is set", async () => {
      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG",
        dryRun: true,
        create: true,
      });
      expect(result.action).toBe("created");
      expect(mockClient.createPage).not.toHaveBeenCalled();
    });
  });

  describe("folder sync", () => {
    it("syncs a folder with markdown files", async () => {
      vi.mocked(isDirectory).mockReturnValue(true);
      vi.mocked(readFolderStructure).mockReturnValue({
        name: "docs",
        path: "/docs",
        relativePath: ".",
        files: [
          {
            path: "/docs/readme.md",
            relativePath: "readme.md",
            name: "readme.md",
            isMarkdown: true,
          },
        ],
        subfolders: [],
      });

      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Root",
        spaceId: "sp1",
      });
      mockClient.findPageByTitle.mockResolvedValue(null);
      mockClient.createPage.mockResolvedValue({
        id: "999",
        title: "Readme",
        spaceId: "sp1",
      });

      const result = await syncAction("docs", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        yes: true,
      });

      expect(result.success).toBe(true);
      expect(mockClient.createPage).toHaveBeenCalled();
    });

    it("creates folder pages for subfolders", async () => {
      vi.mocked(isDirectory).mockReturnValue(true);
      vi.mocked(readFolderStructure).mockReturnValue({
        name: "docs",
        path: "/docs",
        relativePath: ".",
        files: [],
        subfolders: [
          {
            name: "api",
            path: "/docs/api",
            relativePath: "api",
            files: [
              {
                path: "/docs/api/auth.md",
                relativePath: "api/auth.md",
                name: "auth.md",
                isMarkdown: true,
              },
            ],
            subfolders: [],
          },
        ],
      });

      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Root",
        spaceId: "sp1",
      });
      mockClient.findPageByTitle.mockResolvedValue(null);
      mockClient.createPage.mockResolvedValue({
        id: "500",
        title: "Api",
        spaceId: "sp1",
      });

      const result = await syncAction("docs", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        yes: true,
      });

      expect(result.success).toBe(true);
      // One for the folder page, one for the file
      expect(mockClient.createPage).toHaveBeenCalledTimes(2);
    });

    it("syncs a folder to a space URL", async () => {
      vi.mocked(isDirectory).mockReturnValue(true);
      vi.mocked(readFolderStructure).mockReturnValue({
        name: "docs",
        path: "/docs",
        relativePath: ".",
        files: [
          {
            path: "/docs/readme.md",
            relativePath: "readme.md",
            name: "readme.md",
            isMarkdown: true,
          },
        ],
        subfolders: [],
      });

      mockClient.getSpace.mockResolvedValue({
        id: "sp1",
        key: "ENG",
        name: "Engineering",
      });
      mockClient.findPageByTitle.mockResolvedValue(null);
      mockClient.createPage.mockResolvedValue({
        id: "999",
        title: "Readme",
        spaceId: "sp1",
      });

      const result = await syncAction("docs", {
        url: "https://test.atlassian.net/wiki/spaces/ENG",
        yes: true,
      });

      expect(result.success).toBe(true);
      expect(mockClient.getSpace).toHaveBeenCalledWith("ENG");
    });

    it("updates existing pages in folder sync", async () => {
      vi.mocked(isDirectory).mockReturnValue(true);
      vi.mocked(readFolderStructure).mockReturnValue({
        name: "docs",
        path: "/docs",
        relativePath: ".",
        files: [
          {
            path: "/docs/readme.md",
            relativePath: "readme.md",
            name: "readme.md",
            isMarkdown: true,
          },
        ],
        subfolders: [],
      });

      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Root",
        spaceId: "sp1",
      });
      mockClient.findPageByTitle.mockResolvedValue({
        id: "existing1",
        title: "Test Title",
        spaceId: "sp1",
        version: { number: 2 },
        status: "current",
      });
      mockClient.updatePage.mockResolvedValue({
        id: "existing1",
        title: "Test Title",
        spaceId: "sp1",
      });

      const result = await syncAction("docs", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        yes: true,
      });

      expect(result.success).toBe(true);
      expect(mockClient.updatePage).toHaveBeenCalled();
    });

    it("reuses existing folder pages", async () => {
      vi.mocked(isDirectory).mockReturnValue(true);
      vi.mocked(readFolderStructure).mockReturnValue({
        name: "docs",
        path: "/docs",
        relativePath: ".",
        files: [],
        subfolders: [
          {
            name: "api",
            path: "/docs/api",
            relativePath: "api",
            files: [
              {
                path: "/docs/api/auth.md",
                relativePath: "api/auth.md",
                name: "auth.md",
                isMarkdown: true,
              },
            ],
            subfolders: [],
          },
        ],
      });

      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Root",
        spaceId: "sp1",
      });
      // First call: finding folder page (exists), second call: finding file page (not found)
      mockClient.findPageByTitle
        .mockResolvedValueOnce({
          id: "existing-folder",
          title: "Api",
          spaceId: "sp1",
          status: "current",
        })
        .mockResolvedValueOnce(null);
      mockClient.createPage.mockResolvedValue({
        id: "new-file",
        title: "Auth",
        spaceId: "sp1",
      });

      const result = await syncAction("docs", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        yes: true,
      });

      expect(result.success).toBe(true);
      // Only one create call (for the file, not the existing folder page)
      expect(mockClient.createPage).toHaveBeenCalledTimes(1);
    });

    it("counts markdown files correctly", async () => {
      vi.mocked(isDirectory).mockReturnValue(true);
      vi.mocked(readFolderStructure).mockReturnValue({
        name: "docs",
        path: "/docs",
        relativePath: ".",
        files: [
          { path: "/docs/a.md", relativePath: "a.md", name: "a.md", isMarkdown: true },
          { path: "/docs/b.txt", relativePath: "b.txt", name: "b.txt", isMarkdown: false },
        ],
        subfolders: [
          {
            name: "sub",
            path: "/docs/sub",
            relativePath: "sub",
            files: [
              { path: "/docs/sub/c.md", relativePath: "sub/c.md", name: "c.md", isMarkdown: true },
            ],
            subfolders: [],
          },
        ],
      });

      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Root",
        spaceId: "sp1",
      });
      mockClient.findPageByTitle.mockResolvedValue(null);
      mockClient.createPage.mockResolvedValue({
        id: "500",
        title: "Test",
        spaceId: "sp1",
      });

      const result = await syncAction("docs", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        yes: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("mermaid support", () => {
    it("processes mermaid blocks and uploads attachments", async () => {
      vi.mocked(hasMermaidBlocks).mockReturnValue(true);
      vi.mocked(findMmdc).mockReturnValue("mmdc");
      vi.mocked(processMermaidBlocks).mockReturnValue({
        markdown: "# Test\n\nMERMAID_DIAGRAM_PLACEHOLDER_0",
        blocks: [
          {
            index: 0,
            success: true,
            code: "graph TD\nA-->B",
            pngBuffer: Buffer.from("fake-png"),
            filename: "mermaid-diagram-0.png",
          },
        ],
      });

      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Page",
        spaceId: "sp1",
        version: { number: 1 },
      });
      mockClient.updatePage.mockResolvedValue({
        id: "12345",
        title: "Test Title",
        spaceId: "sp1",
      });
      mockClient.uploadAttachment.mockResolvedValue({
        success: true,
        fileId: "file-abc",
        collectionName: "contentId-12345",
      });
      mockClient.getPageVersion.mockResolvedValue(2);

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
      });

      expect(result.success).toBe(true);
      expect(mockClient.uploadAttachment).toHaveBeenCalledWith(
        "12345",
        "mermaid-diagram-0.png",
        expect.any(Buffer),
      );
      // Page should be updated twice: once for content, once for mermaid media
      expect(mockClient.updatePage).toHaveBeenCalledTimes(2);
    });

    it("skips mermaid when mmdc is not available", async () => {
      vi.mocked(hasMermaidBlocks).mockReturnValue(true);
      vi.mocked(findMmdc).mockReturnValue(null);

      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Page",
        spaceId: "sp1",
        version: { number: 1 },
      });
      mockClient.updatePage.mockResolvedValue({
        id: "12345",
        title: "Test Title",
        spaceId: "sp1",
      });

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
      });

      expect(result.success).toBe(true);
      expect(processMermaidBlocks).not.toHaveBeenCalled();
      expect(mockClient.uploadAttachment).not.toHaveBeenCalled();
    });

    it("does not upload when no mermaid blocks are present", async () => {
      // hasMermaidBlocks is mocked to return false by default
      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Page",
        spaceId: "sp1",
        version: { number: 1 },
      });
      mockClient.updatePage.mockResolvedValue({
        id: "12345",
        title: "Test Title",
        spaceId: "sp1",
      });

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
      });

      expect(result.success).toBe(true);
      expect(mockClient.uploadAttachment).not.toHaveBeenCalled();
      // Only one update call (no second pass)
      expect(mockClient.updatePage).toHaveBeenCalledTimes(1);
    });

    it("skips second pass when all mermaid renders failed", async () => {
      vi.mocked(hasMermaidBlocks).mockReturnValue(true);
      vi.mocked(findMmdc).mockReturnValue("mmdc");
      vi.mocked(processMermaidBlocks).mockReturnValue({
        markdown: "# Test\n\nMERMAID_ERROR_PLACEHOLDER_0",
        blocks: [
          {
            index: 0,
            success: false,
            code: "bad diagram",
            error: "parse error",
          },
        ],
      });

      mockClient.getPage.mockResolvedValue({
        id: "12345",
        title: "Page",
        spaceId: "sp1",
        version: { number: 1 },
      });
      mockClient.updatePage.mockResolvedValue({
        id: "12345",
        title: "Test Title",
        spaceId: "sp1",
      });

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
      });

      expect(result.success).toBe(true);
      expect(mockClient.uploadAttachment).not.toHaveBeenCalled();
      // Only one update (no second pass for failed renders)
      expect(mockClient.updatePage).toHaveBeenCalledTimes(1);
    });

    it("includes mermaid info in dry-run output", async () => {
      vi.mocked(hasMermaidBlocks).mockReturnValue(true);
      vi.mocked(findMmdc).mockReturnValue("mmdc");
      vi.mocked(processMermaidBlocks).mockReturnValue({
        markdown: "# Test\n\nMERMAID_DIAGRAM_PLACEHOLDER_0",
        blocks: [
          {
            index: 0,
            success: true,
            code: "graph TD",
            pngBuffer: Buffer.from("png"),
            filename: "mermaid-diagram-0.png",
          },
        ],
      });

      const result = await syncAction("test.md", {
        url: "https://test.atlassian.net/wiki/spaces/ENG/pages/12345",
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(mockClient.updatePage).not.toHaveBeenCalled();
      expect(mockClient.uploadAttachment).not.toHaveBeenCalled();
    });
  });
});
