import { describe, it, expect } from "vitest";
import {
  Md2cfConfigSchema,
  PartialMd2cfConfigSchema,
  SyncOptionsSchema,
  ParsedConfluenceUrlSchema,
} from "../../src/lib/schemas.js";

describe("schemas", () => {
  describe("Md2cfConfigSchema", () => {
    it("accepts valid config", () => {
      const result = Md2cfConfigSchema.safeParse({
        email: "user@example.com",
        token: "abc123",
        baseUrl: "https://company.atlassian.net",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing email", () => {
      const result = Md2cfConfigSchema.safeParse({
        token: "abc123",
        baseUrl: "https://company.atlassian.net",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty email", () => {
      const result = Md2cfConfigSchema.safeParse({
        email: "",
        token: "abc123",
        baseUrl: "https://company.atlassian.net",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const result = Md2cfConfigSchema.safeParse({
        email: "not-an-email",
        token: "abc123",
        baseUrl: "https://company.atlassian.net",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing token", () => {
      const result = Md2cfConfigSchema.safeParse({
        email: "user@example.com",
        baseUrl: "https://company.atlassian.net",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty token", () => {
      const result = Md2cfConfigSchema.safeParse({
        email: "user@example.com",
        token: "",
        baseUrl: "https://company.atlassian.net",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing baseUrl", () => {
      const result = Md2cfConfigSchema.safeParse({
        email: "user@example.com",
        token: "abc123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid baseUrl", () => {
      const result = Md2cfConfigSchema.safeParse({
        email: "user@example.com",
        token: "abc123",
        baseUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("rejects extra unknown fields (strips them)", () => {
      const result = Md2cfConfigSchema.safeParse({
        email: "user@example.com",
        token: "abc123",
        baseUrl: "https://company.atlassian.net",
        extra: "field",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect("extra" in result.data).toBe(false);
      }
    });
  });

  describe("PartialMd2cfConfigSchema", () => {
    it("accepts empty object", () => {
      const result = PartialMd2cfConfigSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial config with just email", () => {
      const result = PartialMd2cfConfigSchema.safeParse({ email: "user@example.com" });
      expect(result.success).toBe(true);
    });

    it("accepts full config", () => {
      const result = PartialMd2cfConfigSchema.safeParse({
        email: "user@example.com",
        token: "abc",
        baseUrl: "https://example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email format when provided", () => {
      const result = PartialMd2cfConfigSchema.safeParse({ email: "bad" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid baseUrl when provided", () => {
      const result = PartialMd2cfConfigSchema.safeParse({ baseUrl: "bad" });
      expect(result.success).toBe(false);
    });
  });

  describe("SyncOptionsSchema", () => {
    it("accepts empty options", () => {
      const result = SyncOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts full options", () => {
      const result = SyncOptionsSchema.safeParse({
        url: "https://company.atlassian.net/wiki/spaces/ENG/pages/123",
        create: true,
        title: "My Page",
        dryRun: false,
        yes: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid url", () => {
      const result = SyncOptionsSchema.safeParse({ url: "not-a-url" });
      expect(result.success).toBe(false);
    });

    it("rejects empty title", () => {
      const result = SyncOptionsSchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("ParsedConfluenceUrlSchema", () => {
    it("accepts valid parsed URL with page", () => {
      const result = ParsedConfluenceUrlSchema.safeParse({
        baseUrl: "https://company.atlassian.net",
        spaceKey: "ENG",
        pageId: "12345",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid parsed URL with space only", () => {
      const result = ParsedConfluenceUrlSchema.safeParse({
        baseUrl: "https://company.atlassian.net",
        spaceKey: "ENG",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing baseUrl", () => {
      const result = ParsedConfluenceUrlSchema.safeParse({
        spaceKey: "ENG",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid baseUrl", () => {
      const result = ParsedConfluenceUrlSchema.safeParse({
        baseUrl: "not-a-url",
        spaceKey: "ENG",
      });
      expect(result.success).toBe(false);
    });
  });
});
