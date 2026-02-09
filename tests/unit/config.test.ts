import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  validateConfig,
  resetConfig,
  getFullConfig,
  getConfigDir,
  getConfigPath,
  maskToken,
} from "../../src/lib/config.js";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/mock-home"),
}));

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";

describe("config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfigDir", () => {
    it("returns the config directory path", () => {
      expect(getConfigDir()).toBe("/mock-home/.md2cf");
    });
  });

  describe("getConfigPath", () => {
    it("returns the config file path", () => {
      expect(getConfigPath()).toBe("/mock-home/.md2cf/config.json");
    });
  });

  describe("loadConfig", () => {
    it("returns empty object when config file does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(loadConfig()).toEqual({});
    });

    it("returns parsed config when file exists", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          email: "test@example.com",
          token: "abc123",
          baseUrl: "https://test.atlassian.net",
        }),
      );
      const config = loadConfig();
      expect(config.email).toBe("test@example.com");
      expect(config.token).toBe("abc123");
      expect(config.baseUrl).toBe("https://test.atlassian.net");
    });
  });

  describe("saveConfig", () => {
    it("creates directory if it does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      saveConfig({ email: "test@example.com" });
      expect(mkdirSync).toHaveBeenCalledWith("/mock-home/.md2cf", { recursive: true });
    });

    it("writes config to file", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const config = { email: "test@example.com", token: "abc" };
      saveConfig(config);
      expect(writeFileSync).toHaveBeenCalledWith(
        "/mock-home/.md2cf/config.json",
        JSON.stringify(config, null, 2) + "\n",
        "utf-8",
      );
    });
  });

  describe("getConfigValue", () => {
    it("returns specific config value", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ email: "user@test.com" }));
      expect(getConfigValue("email")).toBe("user@test.com");
    });

    it("returns undefined for missing key", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));
      expect(getConfigValue("email")).toBeUndefined();
    });
  });

  describe("setConfigValue", () => {
    it("sets a value and saves config", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ email: "old@test.com" }));
      setConfigValue("email", "new@test.com");
      expect(writeFileSync).toHaveBeenCalled();
      const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
      expect(JSON.parse(writtenContent).email).toBe("new@test.com");
    });
  });

  describe("validateConfig", () => {
    it("returns valid when all required fields present", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          email: "test@example.com",
          token: "token123",
          baseUrl: "https://test.atlassian.net",
        }),
      );
      const result = validateConfig();
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("returns invalid with missing fields", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ email: "test@example.com" }));
      const result = validateConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain("token");
      expect(result.missing).toContain("baseUrl");
    });

    it("returns invalid when no config exists", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = validateConfig();
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(["email", "token", "baseUrl"]);
    });
  });

  describe("resetConfig", () => {
    it("deletes config file when it exists", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      resetConfig();
      expect(unlinkSync).toHaveBeenCalledWith("/mock-home/.md2cf/config.json");
    });

    it("does nothing when config file does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      resetConfig();
      expect(unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe("getFullConfig", () => {
    it("returns full config when valid", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          email: "test@example.com",
          token: "token123",
          baseUrl: "https://test.atlassian.net",
        }),
      );
      const config = getFullConfig();
      expect(config.email).toBe("test@example.com");
      expect(config.token).toBe("token123");
      expect(config.baseUrl).toBe("https://test.atlassian.net");
    });

    it("throws when config is incomplete", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(() => getFullConfig()).toThrow("Missing required configuration");
    });
  });

  describe("maskToken", () => {
    it("masks a long token", () => {
      expect(maskToken("abcdefghijklmnop")).toBe("abcd****mnop");
    });

    it("masks a short token", () => {
      expect(maskToken("short")).toBe("****");
    });

    it("masks tokens exactly 8 chars", () => {
      expect(maskToken("12345678")).toBe("****");
    });

    it("masks tokens longer than 8 chars", () => {
      expect(maskToken("123456789")).toBe("1234****6789");
    });
  });
});
