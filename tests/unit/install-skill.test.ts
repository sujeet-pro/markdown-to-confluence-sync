import { describe, it, expect, vi, beforeEach } from "vitest";
import { installSkill, getSupportedAgents } from "../../src/cli/commands/install-skill.js";

vi.mock("node:fs", () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/mock-home"),
}));

import { mkdirSync, writeFileSync } from "node:fs";

describe("install-skill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.exit to prevent test from exiting
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit: ${code}`);
    }) as never);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("getSupportedAgents", () => {
    it("returns list of supported agents", () => {
      const agents = getSupportedAgents();
      expect(agents).toContain("claude");
      expect(agents).toContain("codex");
      expect(agents).toContain("gemini");
      expect(agents.length).toBe(3);
    });
  });

  describe("installSkill", () => {
    it("installs skill for claude", () => {
      installSkill("claude");
      expect(mkdirSync).toHaveBeenCalledWith("/mock-home/.claude/skills/md2cf", {
        recursive: true,
      });
      expect(writeFileSync).toHaveBeenCalledWith(
        "/mock-home/.claude/skills/md2cf/SKILL.md",
        expect.stringContaining("md2cf"),
        "utf-8",
      );
    });

    it("installs skill for codex", () => {
      installSkill("codex");
      expect(mkdirSync).toHaveBeenCalledWith("/mock-home/.codex/skills/md2cf", {
        recursive: true,
      });
      expect(writeFileSync).toHaveBeenCalledWith(
        "/mock-home/.codex/skills/md2cf/SKILL.md",
        expect.stringContaining("md2cf"),
        "utf-8",
      );
    });

    it("installs skill for gemini", () => {
      installSkill("gemini");
      expect(mkdirSync).toHaveBeenCalledWith("/mock-home/.gemini/skills/md2cf", {
        recursive: true,
      });
      expect(writeFileSync).toHaveBeenCalledWith(
        "/mock-home/.gemini/skills/md2cf/SKILL.md",
        expect.stringContaining("md2cf"),
        "utf-8",
      );
    });

    it("installs skill case-insensitively", () => {
      installSkill("Claude");
      expect(mkdirSync).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalled();
    });

    it("exits with error for unsupported agent", () => {
      expect(() => installSkill("unsupported-agent")).toThrow("process.exit: 1");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("writes SKILL.md with correct content", () => {
      installSkill("claude");
      const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
      expect(writtenContent).toContain("name: md2cf");
      expect(writtenContent).toContain("md2cf");
      expect(writtenContent).toContain("--create");
    });
  });
});
