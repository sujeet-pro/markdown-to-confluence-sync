import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfluenceClient } from "../../src/lib/confluence.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

describe("ConfluenceClient", () => {
  let client: ConfluenceClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ConfluenceClient("https://test.atlassian.net", "user@test.com", "api-token");
  });

  describe("constructor", () => {
    it("builds correct API base URL", () => {
      // Verify by making a request and checking the URL
      mockFetch.mockResolvedValue(mockResponse({ id: "1", title: "Test" }));
      client.getPage("1");
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("https://test.atlassian.net/wiki/api/v2");
    });

    it("sets Basic auth header", () => {
      mockFetch.mockResolvedValue(mockResponse({ id: "1" }));
      client.getPage("1");
      const headers = mockFetch.mock.calls[0][1].headers;
      const expected = "Basic " + Buffer.from("user@test.com:api-token").toString("base64");
      expect(headers.Authorization).toBe(expected);
    });
  });

  describe("getPage", () => {
    it("fetches a page by ID", async () => {
      const pageData = {
        id: "12345",
        status: "current",
        title: "Test Page",
        spaceId: "sp1",
        version: { number: 3 },
      };
      mockFetch.mockResolvedValue(mockResponse(pageData));

      const page = await client.getPage("12345");
      expect(page.id).toBe("12345");
      expect(page.title).toBe("Test Page");
      expect(page.version?.number).toBe(3);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("/pages/12345");
      expect(calledUrl).toContain("body-format=atlas_doc_format");
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValue(
        mockResponse(
          { errors: [{ status: 404, code: "NOT_FOUND", title: "Page not found" }] },
          404,
        ),
      );

      await expect(client.getPage("99999")).rejects.toThrow("Confluence API error (404)");
    });

    it("includes error detail from response", async () => {
      mockFetch.mockResolvedValue(mockResponse({ message: "Unauthorized" }, 401));

      await expect(client.getPage("1")).rejects.toThrow("Unauthorized");
    });
  });

  describe("getSpace", () => {
    it("fetches a space by key", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({
          results: [
            { id: "sp1", key: "ENG", name: "Engineering", type: "global", status: "current" },
          ],
        }),
      );

      const space = await client.getSpace("ENG");
      expect(space.key).toBe("ENG");
      expect(space.name).toBe("Engineering");
    });

    it("throws when space not found", async () => {
      mockFetch.mockResolvedValue(mockResponse({ results: [] }));

      await expect(client.getSpace("NOPE")).rejects.toThrow("Space not found: NOPE");
    });
  });

  describe("findPageByTitle", () => {
    it("returns page when found", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({
          results: [{ id: "123", title: "My Page", spaceId: "sp1", status: "current" }],
        }),
      );

      const page = await client.findPageByTitle("sp1", "My Page");
      expect(page?.id).toBe("123");
      expect(page?.title).toBe("My Page");
    });

    it("returns null when no match", async () => {
      mockFetch.mockResolvedValue(mockResponse({ results: [] }));

      const page = await client.findPageByTitle("sp1", "Nonexistent");
      expect(page).toBeNull();
    });
  });

  describe("createPage", () => {
    it("creates a page without parent", async () => {
      const createdPage = { id: "999", title: "New Page", spaceId: "sp1", status: "current" };
      mockFetch.mockResolvedValue(mockResponse(createdPage));

      const adf = { version: 1 as const, type: "doc" as const, content: [] };
      const page = await client.createPage("sp1", "New Page", adf);
      expect(page.id).toBe("999");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.spaceId).toBe("sp1");
      expect(requestBody.title).toBe("New Page");
      expect(requestBody.body.representation).toBe("atlas_doc_format");
      expect(requestBody.parentId).toBeUndefined();
    });

    it("creates a page with parent", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ id: "1000", title: "Child", spaceId: "sp1", status: "current" }),
      );

      const adf = { version: 1 as const, type: "doc" as const, content: [] };
      await client.createPage("sp1", "Child", adf, "500");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.parentId).toBe("500");
    });

    it("sends ADF body as stringified JSON", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ id: "1", title: "Test", spaceId: "sp1", status: "current" }),
      );

      const adf = {
        version: 1 as const,
        type: "doc" as const,
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
      };
      await client.createPage("sp1", "Test", adf);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const bodyValue = requestBody.body.value;
      expect(typeof bodyValue).toBe("string");
      const parsed = JSON.parse(bodyValue);
      expect(parsed.type).toBe("doc");
      expect(parsed.content[0].type).toBe("paragraph");
    });
  });

  describe("updatePage", () => {
    it("updates a page with new version", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ id: "123", title: "Updated", spaceId: "sp1", status: "current" }),
      );

      const adf = { version: 1 as const, type: "doc" as const, content: [] };
      const page = await client.updatePage("123", "Updated", adf, 5, "My update message");
      expect(page.id).toBe("123");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.id).toBe("123");
      expect(requestBody.version.number).toBe(5);
      expect(requestBody.version.message).toBe("My update message");
      expect(requestBody.body.representation).toBe("atlas_doc_format");

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("/pages/123");
    });

    it("uses default version message when not provided", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ id: "1", title: "Test", spaceId: "sp1", status: "current" }),
      );

      const adf = { version: 1 as const, type: "doc" as const, content: [] };
      await client.updatePage("1", "Test", adf, 2);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.version.message).toBe("Updated via md2cf");
    });
  });

  describe("getPageChildren", () => {
    it("returns child pages", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({
          results: [
            { id: "c1", title: "Child 1", spaceId: "sp1", status: "current" },
            { id: "c2", title: "Child 2", spaceId: "sp1", status: "current" },
          ],
        }),
      );

      const children = await client.getPageChildren("parent1");
      expect(children).toHaveLength(2);
      expect(children[0].title).toBe("Child 1");
    });

    it("returns empty array when no children", async () => {
      mockFetch.mockResolvedValue(mockResponse({ results: [] }));

      const children = await client.getPageChildren("parent1");
      expect(children).toEqual([]);
    });
  });

  describe("checkAccess", () => {
    it("succeeds when API is reachable", async () => {
      mockFetch.mockResolvedValue(mockResponse({ results: [] }));
      await expect(client.checkAccess()).resolves.toBeUndefined();
    });

    it("throws auth error on 401", async () => {
      mockFetch.mockResolvedValue(mockResponse({ message: "Unauthorized" }, 401));
      await expect(client.checkAccess()).rejects.toThrow("Authentication failed");
    });

    it("throws permission error on 403", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ errors: [{ status: 403, code: "FORBIDDEN", title: "Access denied" }] }, 403),
      );
      await expect(client.checkAccess()).rejects.toThrow("Access denied");
    });

    it("throws network error on fetch failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      await expect(client.checkAccess()).rejects.toThrow("Cannot reach Confluence");
    });
  });

  describe("getPageVersion", () => {
    it("returns the current version number", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({
          id: "123",
          title: "Test",
          spaceId: "sp1",
          status: "current",
          version: { number: 5 },
        }),
      );
      const version = await client.getPageVersion("123");
      expect(version).toBe(5);
    });

    it("returns 0 when page has no version", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ id: "123", title: "Test", spaceId: "sp1", status: "current" }),
      );
      const version = await client.getPageVersion("123");
      expect(version).toBe(0);
    });
  });

  describe("uploadAttachment", () => {
    it("uploads a file attachment successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          results: [
            {
              extensions: { fileId: "abc-123", collectionName: "contentId-page1" },
            },
          ],
        }),
      });

      const buffer = Buffer.from("fake-png");
      const result = await client.uploadAttachment("page1", "diagram.png", buffer);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe("abc-123");
      expect(result.collectionName).toBe("contentId-page1");

      // Verify it called the v1 API
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("/wiki/rest/api/content/page1/child/attachment");

      // Verify headers
      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders["X-Atlassian-Token"]).toBe("nocheck");
    });

    it("updates existing attachment on 400 (duplicate)", async () => {
      // First call: upload returns 400
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Duplicate"),
      });
      // Second call: list attachments
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            {
              id: "att-1",
              extensions: { fileId: "existing-file-id", collectionName: "contentId-page1" },
            },
          ],
        }),
      });
      // Third call: update attachment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          extensions: { fileId: "updated-file-id", collectionName: "contentId-page1" },
        }),
      });

      const buffer = Buffer.from("fake-png");
      const result = await client.uploadAttachment("page1", "diagram.png", buffer);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe("updated-file-id");
    });

    it("returns error on non-400 failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Server error"),
      });

      const buffer = Buffer.from("fake-png");
      const result = await client.uploadAttachment("page1", "diagram.png", buffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });

    it("returns error on fetch exception", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const buffer = Buffer.from("fake-png");
      const result = await client.uploadAttachment("page1", "diagram.png", buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network failure");
    });

    it("uses default collectionName when not returned", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          results: [{ extensions: { fileId: "abc" } }],
        }),
      });

      const result = await client.uploadAttachment("page1", "test.png", Buffer.from("png"));
      expect(result.collectionName).toBe("contentId-page1");
    });

    it("handles missing attachment in duplicate list", async () => {
      // Upload returns 400
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Duplicate"),
      });
      // List returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      });

      const result = await client.uploadAttachment("page1", "test.png", Buffer.from("png"));
      expect(result.success).toBe(false);
      expect(result.error).toContain("could not find existing");
    });

    it("handles list attachments failure during duplicate handling", async () => {
      // Upload returns 400
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Duplicate"),
      });
      // List fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await client.uploadAttachment("page1", "test.png", Buffer.from("png"));
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to list attachments");
    });

    it("handles update attachment failure during duplicate handling", async () => {
      // Upload returns 400
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Duplicate"),
      });
      // List returns existing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [{ id: "att-1", extensions: { fileId: "f1" } }],
        }),
      });
      // Update fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await client.uploadAttachment("page1", "test.png", Buffer.from("png"));
      expect(result.success).toBe(false);
      expect(result.error).toContain("Update attachment failed");
    });
  });

  describe("error handling", () => {
    it("handles non-JSON error responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: vi.fn().mockResolvedValue("Internal Server Error"),
      });

      await expect(client.getPage("1")).rejects.toThrow("Confluence API error (500)");
    });

    it("handles empty response body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      });

      const result = await client.getPage("1");
      expect(result).toEqual({});
    });

    it("handles error response with errors array", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ errors: [{ status: 403, code: "FORBIDDEN", title: "Access denied" }] }, 403),
      );

      await expect(client.getPage("1")).rejects.toThrow("Access denied");
    });
  });
});
