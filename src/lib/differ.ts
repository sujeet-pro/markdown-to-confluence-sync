import { diffLines } from "diff";
import type { MergeStrategy, MergeResult } from "./types.js";

/**
 * Merge local and remote markdown using the specified strategy.
 */
export function mergeMarkdown(
  local: string,
  remote: string,
  strategy: MergeStrategy,
): MergeResult {
  switch (strategy) {
    case "local-wins":
      return localWins(local, remote);
    case "remote-wins":
      return remoteWins(local, remote);
    case "append":
      return appendStrategy(local, remote);
    case "auto-merge":
      return autoMerge(local, remote);
  }
}

function localWins(local: string, remote: string): MergeResult {
  const diff = diffLines(remote, local);
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const part of diff) {
    const lineCount = countLines(part.value);
    if (part.added) {
      added += lineCount;
    } else if (part.removed) {
      removed += lineCount;
    } else {
      unchanged += lineCount;
    }
  }

  return {
    markdown: local,
    hasConflicts: false,
    stats: { added, removed, unchanged },
  };
}

function remoteWins(local: string, remote: string): MergeResult {
  const diff = diffLines(local, remote);
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const part of diff) {
    const lineCount = countLines(part.value);
    if (part.added) {
      added += lineCount;
    } else if (part.removed) {
      removed += lineCount;
    } else {
      unchanged += lineCount;
    }
  }

  return {
    markdown: remote,
    hasConflicts: false,
    stats: { added, removed, unchanged },
  };
}

function appendStrategy(local: string, remote: string): MergeResult {
  const separator = "\n\n---\n\n";
  const merged = remote.trimEnd() + separator + local.trimStart();
  const localLines = countLines(local);
  const remoteLines = countLines(remote);

  return {
    markdown: merged,
    hasConflicts: false,
    stats: { added: localLines, removed: 0, unchanged: remoteLines },
  };
}

function autoMerge(local: string, remote: string): MergeResult {
  // If local and remote are identical, no merge needed
  if (local === remote) {
    return {
      markdown: local,
      hasConflicts: false,
      stats: { added: 0, removed: 0, unchanged: countLines(local) },
    };
  }

  const diff = diffLines(remote, local);
  const result: string[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  let hasConflicts = false;

  // Walk through the diff: unchanged lines are kept, additions from local are kept,
  // removals from remote are kept (these are lines remote had that local removed).
  // When both sides changed the same region (consecutive remove+add), prefer local.
  let i = 0;
  while (i < diff.length) {
    const part = diff[i];

    if (!part.added && !part.removed) {
      // Unchanged
      result.push(part.value);
      unchanged += countLines(part.value);
      i++;
    } else if (part.added && !part.removed) {
      // Lines added in local (not present in remote)
      result.push(part.value);
      added += countLines(part.value);
      i++;
    } else if (part.removed && !part.added) {
      // Check if next part is an addition (conflict: both sides changed)
      const next = diff[i + 1];
      if (next && next.added) {
        // Conflict region: prefer local (the addition)
        result.push(next.value);
        added += countLines(next.value);
        removed += countLines(part.value);
        hasConflicts = true;
        i += 2;
      } else {
        // Lines removed from local — omit them
        removed += countLines(part.value);
        i++;
      }
    } else {
      // Shouldn't happen with diffLines, but handle gracefully
      result.push(part.value);
      i++;
    }
  }

  const markdown = result.join("");

  return {
    markdown,
    hasConflicts,
    stats: { added, removed, unchanged },
  };
}

function countLines(text: string): number {
  if (!text) return 0;
  // Count newlines; a trailing newline doesn't add an extra line
  const lines = text.split("\n");
  return lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
}
