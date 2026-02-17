import { describe, it, expect } from "vitest";
import { mergeMarkdown } from "../../src/lib/differ.js";

describe("mergeMarkdown", () => {
  describe("local-wins strategy", () => {
    it("returns local content", () => {
      const result = mergeMarkdown("# Local\nLocal content\n", "# Remote\nRemote content\n", "local-wins");
      expect(result.markdown).toBe("# Local\nLocal content\n");
      expect(result.hasConflicts).toBe(false);
    });

    it("reports added and removed stats", () => {
      const result = mergeMarkdown("line A\nline B\n", "line A\nline C\n", "local-wins");
      expect(result.stats.unchanged).toBeGreaterThan(0);
      expect(result.hasConflicts).toBe(false);
    });

    it("reports no changes when content is identical", () => {
      const content = "# Same\nIdentical content\n";
      const result = mergeMarkdown(content, content, "local-wins");
      expect(result.markdown).toBe(content);
      expect(result.stats.added).toBe(0);
      expect(result.stats.removed).toBe(0);
      expect(result.stats.unchanged).toBeGreaterThan(0);
    });
  });

  describe("remote-wins strategy", () => {
    it("returns remote content", () => {
      const result = mergeMarkdown("# Local\nLocal content\n", "# Remote\nRemote content\n", "remote-wins");
      expect(result.markdown).toBe("# Remote\nRemote content\n");
      expect(result.hasConflicts).toBe(false);
    });

    it("reports added and removed stats", () => {
      const result = mergeMarkdown("line A\nline B\n", "line A\nline C\n", "remote-wins");
      expect(result.stats.unchanged).toBeGreaterThan(0);
      expect(result.hasConflicts).toBe(false);
    });

    it("reports no changes when content is identical", () => {
      const content = "# Same\nIdentical content\n";
      const result = mergeMarkdown(content, content, "remote-wins");
      expect(result.markdown).toBe(content);
      expect(result.stats.added).toBe(0);
      expect(result.stats.removed).toBe(0);
    });
  });

  describe("append strategy", () => {
    it("concatenates remote and local with separator", () => {
      const result = mergeMarkdown("# Local\n", "# Remote\n", "append");
      expect(result.markdown).toContain("# Remote");
      expect(result.markdown).toContain("---");
      expect(result.markdown).toContain("# Local");
    });

    it("puts remote content before local content", () => {
      const result = mergeMarkdown("local part\n", "remote part\n", "append");
      const remoteIdx = result.markdown.indexOf("remote part");
      const localIdx = result.markdown.indexOf("local part");
      expect(remoteIdx).toBeLessThan(localIdx);
    });

    it("has no conflicts", () => {
      const result = mergeMarkdown("a\n", "b\n", "append");
      expect(result.hasConflicts).toBe(false);
    });

    it("counts added lines as local lines", () => {
      const result = mergeMarkdown("line1\nline2\n", "remote1\n", "append");
      expect(result.stats.added).toBe(2);
      expect(result.stats.removed).toBe(0);
      expect(result.stats.unchanged).toBe(1);
    });
  });

  describe("auto-merge strategy", () => {
    it("returns identical content when local and remote match", () => {
      const content = "# Title\nSame content\n";
      const result = mergeMarkdown(content, content, "auto-merge");
      expect(result.markdown).toBe(content);
      expect(result.hasConflicts).toBe(false);
      expect(result.stats.added).toBe(0);
      expect(result.stats.removed).toBe(0);
      expect(result.stats.unchanged).toBeGreaterThan(0);
    });

    it("merges non-conflicting changes", () => {
      const base = "line 1\nline 2\nline 3\n";
      // Local adds a line at the end
      const local = "line 1\nline 2\nline 3\nline 4\n";
      // Remote is the same as base (no changes from remote side)
      const remote = base;
      const result = mergeMarkdown(local, remote, "auto-merge");
      expect(result.markdown).toContain("line 4");
      expect(result.stats.added).toBeGreaterThan(0);
    });

    it("prefers local for conflicting regions", () => {
      const local = "# Title\nLocal version\n";
      const remote = "# Title\nRemote version\n";
      const result = mergeMarkdown(local, remote, "auto-merge");
      expect(result.markdown).toContain("Local version");
      expect(result.hasConflicts).toBe(true);
    });

    it("sets hasConflicts to true when both sides changed", () => {
      const local = "changed by local\n";
      const remote = "changed by remote\n";
      const result = mergeMarkdown(local, remote, "auto-merge");
      expect(result.hasConflicts).toBe(true);
    });

    it("handles completely different content", () => {
      const local = "entirely new local content\n";
      const remote = "entirely different remote content\n";
      const result = mergeMarkdown(local, remote, "auto-merge");
      // Local wins in conflicts
      expect(result.markdown).toContain("entirely new local content");
      expect(result.hasConflicts).toBe(true);
      expect(result.stats.added).toBeGreaterThan(0);
      expect(result.stats.removed).toBeGreaterThan(0);
    });

    it("handles local additions that do not conflict with remote", () => {
      const remote = "line 1\nline 2\n";
      const local = "line 1\nline 2\nline 3\n";
      const result = mergeMarkdown(local, remote, "auto-merge");
      expect(result.markdown).toContain("line 3");
      expect(result.hasConflicts).toBe(false);
    });

    it("handles local removals that do not conflict with remote", () => {
      const remote = "line 1\nline 2\nline 3\n";
      const local = "line 1\nline 3\n";
      const result = mergeMarkdown(local, remote, "auto-merge");
      expect(result.markdown).not.toContain("line 2");
    });
  });

  describe("stats correctness", () => {
    it("local-wins with completely different content has adds and removes", () => {
      const result = mergeMarkdown("A\n", "B\n", "local-wins");
      expect(result.stats.added).toBeGreaterThan(0);
      expect(result.stats.removed).toBeGreaterThan(0);
      expect(result.stats.unchanged).toBe(0);
    });

    it("remote-wins with completely different content has adds and removes", () => {
      const result = mergeMarkdown("A\n", "B\n", "remote-wins");
      expect(result.stats.added).toBeGreaterThan(0);
      expect(result.stats.removed).toBeGreaterThan(0);
      expect(result.stats.unchanged).toBe(0);
    });

    it("auto-merge with identical content has only unchanged", () => {
      const content = "line 1\nline 2\nline 3\n";
      const result = mergeMarkdown(content, content, "auto-merge");
      expect(result.stats.added).toBe(0);
      expect(result.stats.removed).toBe(0);
      expect(result.stats.unchanged).toBe(3);
    });
  });
});
