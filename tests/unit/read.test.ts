import { describe, it, expect, vi, beforeEach } from "vitest";
import { readAction } from "../../src/cli/commands/read.js";

// Mock dependencies
vi.mock("../../src/lib/config.js", () => ({
  getFullConfig: vi.fn(() => ({
    email: "test@example.com",
    token: "test-token",
    baseUrl: "https://test.atlassian.net",
  })),
}));

vi.mock("../../src/lib/confluence.js", () => {
  const mockClient = {
    getPage: vi.fn(),
  };
  return {
    ConfluenceClient: vi.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

vi.mock("../../src/lib/adf-to-markdown.js", () => ({
  adfToMarkdown: vi.fn(() => "# Test\nContent"),
}));

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
}));

import { ConfluenceClient } from "../../src/lib/confluence.js";
import { adfToMarkdown } from "../../src/lib/adf-to-markdown.js";
import { writeFileSync } from "node:fs";

describe("read command", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-configure mocks after reset
    vi.mocked(adfToMarkdown).mockReturnValue("# Test\nContent");

    // Get mock client instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockClient = new (ConfluenceClient as any)();

    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  it("prints markdown to stdout by default", async () => {
    mockClient.getPage.mockResolvedValue({
      id: "12345",
      title: "Test Page",
      body: {
        atlas_doc_format: {
          value: JSON.stringify({ version: 1, type: "doc", content: [] }),
          representation: "atlas_doc_format",
        },
      },
    });

    await readAction("https://test.atlassian.net/wiki/spaces/ENG/pages/12345", {});

    expect(stdoutSpy).toHaveBeenCalledWith("# Test\nContent");
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("writes to file with --output option", async () => {
    mockClient.getPage.mockResolvedValue({
      id: "12345",
      title: "Test Page",
      body: {
        atlas_doc_format: {
          value: JSON.stringify({ version: 1, type: "doc", content: [] }),
          representation: "atlas_doc_format",
        },
      },
    });

    await readAction("https://test.atlassian.net/wiki/spaces/ENG/pages/12345", {
      output: "output.md",
    });

    expect(writeFileSync).toHaveBeenCalledWith("output.md", "# Test\nContent", "utf-8");
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("throws when URL points to a space (no pageId)", async () => {
    await expect(
      readAction("https://test.atlassian.net/wiki/spaces/ENG", {}),
    ).rejects.toThrow("URL must point to a specific page");
  });

  it("throws when page has no ADF content", async () => {
    mockClient.getPage.mockResolvedValue({
      id: "12345",
      title: "Empty Page",
      body: {},
    });

    await expect(
      readAction("https://test.atlassian.net/wiki/spaces/ENG/pages/12345", {}),
    ).rejects.toThrow("Page has no ADF content");
  });

  it("throws when page body is missing entirely", async () => {
    mockClient.getPage.mockResolvedValue({
      id: "12345",
      title: "No Body Page",
    });

    await expect(
      readAction("https://test.atlassian.net/wiki/spaces/ENG/pages/12345", {}),
    ).rejects.toThrow("Page has no ADF content");
  });

  it("passes parsed ADF to adfToMarkdown", async () => {
    const adfContent = { version: 1, type: "doc", content: [{ type: "paragraph" }] };
    mockClient.getPage.mockResolvedValue({
      id: "12345",
      title: "Test Page",
      body: {
        atlas_doc_format: {
          value: JSON.stringify(adfContent),
          representation: "atlas_doc_format",
        },
      },
    });

    await readAction("https://test.atlassian.net/wiki/spaces/ENG/pages/12345", {});

    expect(adfToMarkdown).toHaveBeenCalledWith(adfContent);
  });
});
