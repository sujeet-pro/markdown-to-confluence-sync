import { describe, it, expect, vi, beforeEach } from "vitest";
import { initAction } from "../../src/cli/commands/init.js";

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));

vi.mock("chalk", () => {
  // Return a proxy that makes any chained property call return a passthrough function
  const handler: ProxyHandler<object> = {
    get: () => {
      return new Proxy((str: string) => str, handler);
    },
    apply: (_target, _thisArg, args: string[]) => {
      return args[0];
    },
  };
  const chalkProxy = new Proxy((str: string) => str, handler);
  return { default: chalkProxy };
});

import { writeFileSync, existsSync } from "node:fs";

describe("init command", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("creates confluence-sample.md file", () => {
    initAction();

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const [path, content] = vi.mocked(writeFileSync).mock.calls[0];
    expect(String(path)).toContain("confluence-sample.md");
    expect(String(content)).toContain("# My Confluence Page");
  });

  it("does not overwrite if file already exists", () => {
    vi.mocked(existsSync).mockReturnValue(true);

    initAction();

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("already exists"),
    );
  });

  it("file content contains expected sections", () => {
    initAction();

    const content = String(vi.mocked(writeFileSync).mock.calls[0][1]);
    expect(content).toContain("## Text Formatting");
    expect(content).toContain("## Lists");
    expect(content).toContain("## Code");
    expect(content).toContain("## Tables");
    expect(content).toContain("## Blockquotes");
    expect(content).toContain("## Links and Images");
    expect(content).toContain("## Other Features");
  });

  it("writes file with utf-8 encoding", () => {
    initAction();

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      "utf-8",
    );
  });

  it("logs success message after creation", () => {
    initAction();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("confluence-sample.md"),
    );
  });

  it("logs hint to delete when file already exists", () => {
    vi.mocked(existsSync).mockReturnValue(true);

    initAction();

    // The second console.log should mention deleting
    const calls = consoleSpy.mock.calls.map((call) => String(call[0]));
    const hasDeleteHint = calls.some((msg) => msg.includes("Delete"));
    expect(hasDeleteHint).toBe(true);
  });
});
