import { describe, it, expect } from "vitest";
import {
  parseConfluenceUrl,
  buildApiBaseUrl,
  buildPageWebUrl,
  extractPageId,
} from "../../src/lib/url-parser.js";

describe("url-parser", () => {
  describe("parseConfluenceUrl", () => {
    it("parses a full page URL with title", () => {
      const result = parseConfluenceUrl(
        "https://company.atlassian.net/wiki/spaces/ENG/pages/12345/My+Page+Title",
      );
      expect(result).toEqual({
        baseUrl: "https://company.atlassian.net",
        spaceKey: "ENG",
        pageId: "12345",
      });
    });

    it("parses a page URL without title", () => {
      const result = parseConfluenceUrl(
        "https://company.atlassian.net/wiki/spaces/ENG/pages/67890",
      );
      expect(result).toEqual({
        baseUrl: "https://company.atlassian.net",
        spaceKey: "ENG",
        pageId: "67890",
      });
    });

    it("parses a space-level URL", () => {
      const result = parseConfluenceUrl("https://company.atlassian.net/wiki/spaces/ENG");
      expect(result).toEqual({
        baseUrl: "https://company.atlassian.net",
        spaceKey: "ENG",
        pageId: undefined,
      });
    });

    it("parses a space-level URL with trailing slash", () => {
      const result = parseConfluenceUrl("https://company.atlassian.net/wiki/spaces/ENG/");
      expect(result).toEqual({
        baseUrl: "https://company.atlassian.net",
        spaceKey: "ENG",
        pageId: undefined,
      });
    });

    it("handles HTTP URLs", () => {
      const result = parseConfluenceUrl("http://internal.company.com/wiki/spaces/TEAM/pages/11111");
      expect(result).toEqual({
        baseUrl: "http://internal.company.com",
        spaceKey: "TEAM",
        pageId: "11111",
      });
    });

    it("throws for invalid URLs", () => {
      expect(() => parseConfluenceUrl("not-a-url")).toThrow("Invalid URL");
    });

    it("throws for non-Confluence URLs", () => {
      expect(() => parseConfluenceUrl("https://example.com/some/path")).toThrow(
        "Could not parse Confluence URL",
      );
    });

    it("throws for URLs with /wiki but no /spaces", () => {
      expect(() => parseConfluenceUrl("https://company.atlassian.net/wiki/other")).toThrow(
        "Could not parse Confluence URL",
      );
    });
  });

  describe("buildApiBaseUrl", () => {
    it("builds API base URL", () => {
      expect(buildApiBaseUrl("https://company.atlassian.net")).toBe(
        "https://company.atlassian.net/wiki/api/v2",
      );
    });

    it("strips trailing slashes", () => {
      expect(buildApiBaseUrl("https://company.atlassian.net/")).toBe(
        "https://company.atlassian.net/wiki/api/v2",
      );
    });

    it("strips multiple trailing slashes", () => {
      expect(buildApiBaseUrl("https://company.atlassian.net///")).toBe(
        "https://company.atlassian.net/wiki/api/v2",
      );
    });
  });

  describe("buildPageWebUrl", () => {
    it("builds web URL from base and path", () => {
      expect(buildPageWebUrl("https://company.atlassian.net", "/spaces/ENG/pages/123")).toBe(
        "https://company.atlassian.net/wiki/spaces/ENG/pages/123",
      );
    });

    it("strips trailing slashes from base", () => {
      expect(buildPageWebUrl("https://company.atlassian.net/", "/spaces/ENG/pages/123")).toBe(
        "https://company.atlassian.net/wiki/spaces/ENG/pages/123",
      );
    });
  });

  describe("extractPageId", () => {
    it("returns numeric string directly", () => {
      expect(extractPageId("12345")).toBe("12345");
    });

    it("extracts page ID from URL", () => {
      expect(extractPageId("https://company.atlassian.net/wiki/spaces/ENG/pages/67890/Title")).toBe(
        "67890",
      );
    });

    it("throws when URL has no page ID", () => {
      expect(() => extractPageId("https://company.atlassian.net/wiki/spaces/ENG")).toThrow(
        "No page ID found",
      );
    });
  });
});
