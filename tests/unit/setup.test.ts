import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/lib/mermaid.js", () => ({
  findMmdc: vi.fn(),
  renderMermaidToPng: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { findMmdc, renderMermaidToPng } from "../../src/lib/mermaid.js";
import { execSync } from "node:child_process";
import { runDiagnostics, printDiagnostics } from "../../src/cli/commands/setup.js";

describe("setup diagnostics", () => {
  beforeEach(() => {
    vi.mocked(findMmdc).mockReturnValue(null);
    vi.mocked(renderMermaidToPng).mockReturnValue({ success: false, error: "not called" });
    vi.mocked(execSync).mockReturnValue("11.0.0\n");
  });

  describe("runDiagnostics", () => {
    it("returns only mmdc-not-found check when mmdc is missing", () => {
      vi.mocked(findMmdc).mockReturnValue(null);
      const checks = runDiagnostics();
      expect(checks).toHaveLength(1);
      expect(checks[0].label).toBe("mmdc binary");
      expect(checks[0].status).toBe("fail");
      expect(checks[0].fix).toContain("npm install");
    });

    it("returns all three checks when mmdc is found and everything passes", () => {
      vi.mocked(findMmdc).mockReturnValue("/pkg/node_modules/.bin/mmdc");
      vi.mocked(execSync).mockReturnValue("11.12.0\n");
      vi.mocked(renderMermaidToPng).mockReturnValue({
        success: true,
        pngBuffer: Buffer.from("png"),
        filename: "mermaid-diagram-999.png",
      });

      const checks = runDiagnostics();
      expect(checks).toHaveLength(3);
      expect(checks[0]).toEqual({
        label: "mmdc binary",
        status: "pass",
        detail: "/pkg/node_modules/.bin/mmdc",
      });
      expect(checks[1]).toEqual({
        label: "mmdc version",
        status: "pass",
        detail: "11.12.0",
      });
      expect(checks[2]).toEqual({
        label: "Mermaid test render",
        status: "pass",
        detail: "OK",
      });
    });

    it("reports version check failure", () => {
      vi.mocked(findMmdc).mockReturnValue("/usr/bin/mmdc");
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("mmdc crashed");
      });
      vi.mocked(renderMermaidToPng).mockReturnValue({
        success: true,
        pngBuffer: Buffer.from("png"),
        filename: "test.png",
      });

      const checks = runDiagnostics();
      expect(checks[1].status).toBe("fail");
      expect(checks[1].detail).toContain("mmdc crashed");
    });

    it("reports test render failure with browser fix hint", () => {
      vi.mocked(findMmdc).mockReturnValue("/usr/bin/mmdc");
      vi.mocked(execSync).mockReturnValue("11.0.0\n");
      vi.mocked(renderMermaidToPng).mockReturnValue({
        success: false,
        error: "Could not find Chrome browser",
      });

      const checks = runDiagnostics();
      expect(checks[2].status).toBe("fail");
      expect(checks[2].fix).toContain("puppeteer browsers install chrome");
    });

    it("reports test render failure with generic fix for non-browser errors", () => {
      vi.mocked(findMmdc).mockReturnValue("/usr/bin/mmdc");
      vi.mocked(execSync).mockReturnValue("11.0.0\n");
      vi.mocked(renderMermaidToPng).mockReturnValue({
        success: false,
        error: "Syntax error in diagram",
      });

      const checks = runDiagnostics();
      expect(checks[2].status).toBe("fail");
      expect(checks[2].fix).toContain("Check the error above");
    });

    it("calls renderMermaidToPng with test diagram and index 999", () => {
      vi.mocked(findMmdc).mockReturnValue("/usr/bin/mmdc");
      vi.mocked(renderMermaidToPng).mockReturnValue({
        success: true,
        pngBuffer: Buffer.from("png"),
        filename: "test.png",
      });

      runDiagnostics();
      expect(renderMermaidToPng).toHaveBeenCalledWith(
        expect.stringContaining("graph TD"),
        999,
        "/usr/bin/mmdc",
      );
    });
  });

  describe("printDiagnostics", () => {
    it("prints pass results without errors", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      printDiagnostics([
        { label: "mmdc binary", status: "pass", detail: "/usr/bin/mmdc" },
        { label: "mmdc version", status: "pass", detail: "11.0.0" },
        { label: "Mermaid test render", status: "pass", detail: "OK" },
      ]);
      const output = consoleSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("mmdc binary");
      expect(output).toContain("All checks passed");
      consoleSpy.mockRestore();
    });

    it("prints fix suggestions for failures", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      printDiagnostics([
        {
          label: "mmdc binary",
          status: "fail",
          detail: "not found",
          fix: "npm install -g md2cf",
        },
      ]);
      const output = consoleSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("npm install -g md2cf");
      expect(output).not.toContain("All checks passed");
      consoleSpy.mockRestore();
    });
  });
});
