import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import type { MermaidBlock, MermaidProcessResult } from "./types.js";

const MERMAID_REGEX = /```mermaid\n([\s\S]*?)```/g;

/**
 * Find the mmdc binary. Since @mermaid-js/mermaid-cli is a bundled dependency,
 * mmdc is installed alongside md2cf. This function searches:
 *   1. Package-relative: md2cf's own node_modules/.bin/mmdc (via import.meta.url)
 *   2. Sibling to the running script (same .bin dir as md2cf)
 *   3. CWD's node_modules/.bin (development / monorepo)
 *   4. Global npm prefix: <npm prefix -g>/lib/node_modules/.bin/mmdc
 *   5. Global PATH (fallback)
 *
 * Returns the path to mmdc or null if not found.
 */
export function findMmdc(): string | null {
  // Check md2cf's own package node_modules — handles global installs where
  // dep binaries aren't symlinked to the global bin dir
  try {
    const thisFile = fileURLToPath(import.meta.url);
    // Walk up to find the md2cf package root (directory containing node_modules)
    let dir = path.dirname(thisFile);
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, "node_modules", ".bin", "mmdc");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // import.meta.url resolution failed — skip this check
  }

  // Check next to the md2cf binary itself — npm places all dep binaries in the same .bin dir
  if (process.argv[1]) {
    const binDir = path.dirname(process.argv[1]);
    const siblingMmdc = path.join(binDir, "mmdc");
    if (fs.existsSync(siblingMmdc)) {
      return siblingMmdc;
    }
  }

  // Check CWD's node_modules (dev / monorepo scenario)
  const localMmdc = path.join(process.cwd(), "node_modules", ".bin", "mmdc");
  if (fs.existsSync(localMmdc)) {
    return localMmdc;
  }

  // Check global npm prefix — handles `npm install -g @mermaid-js/mermaid-cli`
  try {
    const prefix = execSync("npm prefix -g", { encoding: "utf8", timeout: 5000 }).trim();
    const libBin = path.join(prefix, "lib", "node_modules", ".bin", "mmdc");
    if (fs.existsSync(libBin)) {
      return libBin;
    }
    // Windows: no lib/ directory
    const directBin = path.join(prefix, "node_modules", ".bin", "mmdc");
    if (fs.existsSync(directBin)) {
      return directBin;
    }
  } catch {
    // npm prefix failed — skip
  }

  // Fallback: check PATH
  try {
    execSync("mmdc --version", { stdio: "ignore", timeout: 5000 });
    return "mmdc";
  } catch {
    return null;
  }
}

/**
 * Render a mermaid code block to a PNG image using the mmdc CLI.
 * Returns an object with the PNG buffer and filename on success, or an error on failure.
 */
export function renderMermaidToPng(
  mermaidCode: string,
  index: number,
  mmdcPath: string,
): { success: true; pngBuffer: Buffer; filename: string } | { success: false; error: string } {
  const tmpDir = path.join(os.tmpdir(), "md2cf-mermaid");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const inputFile = path.join(tmpDir, `diagram-${index}.mmd`);
  const outputFile = path.join(tmpDir, `diagram-${index}.png`);

  try {
    fs.writeFileSync(inputFile, mermaidCode);

    execSync(`"${mmdcPath}" -i "${inputFile}" -o "${outputFile}" -b white -s 2 --quiet`, {
      encoding: "utf8",
      timeout: 60000,
    });

    if (fs.existsSync(outputFile)) {
      const pngBuffer = fs.readFileSync(outputFile);
      return {
        success: true,
        pngBuffer,
        filename: `mermaid-diagram-${index}.png`,
      };
    }

    return { success: false, error: "PNG file was not generated" };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
    } catch {
      /* ignore cleanup errors */
    }
    try {
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

/**
 * Check if a markdown string contains any mermaid code blocks.
 */
export function hasMermaidBlocks(markdown: string): boolean {
  return MERMAID_REGEX.test(markdown);
}

/**
 * Extract mermaid code blocks from markdown, render each to PNG,
 * and replace the blocks with placeholder strings.
 *
 * Placeholders follow the pattern: MERMAID_DIAGRAM_PLACEHOLDER_0, MERMAID_DIAGRAM_PLACEHOLDER_1, etc.
 * Failed renders use: MERMAID_ERROR_PLACEHOLDER_0, etc.
 *
 * Returns the modified markdown and the processed blocks with PNG data.
 */
export function processMermaidBlocks(markdown: string, mmdcPath: string): MermaidProcessResult {
  let index = 0;
  const blocks: MermaidBlock[] = [];

  // Reset regex lastIndex since it's a global regex
  MERMAID_REGEX.lastIndex = 0;

  const processedMarkdown = markdown.replace(MERMAID_REGEX, (_match, code: string) => {
    const trimmedCode = code.trim();
    const result = renderMermaidToPng(trimmedCode, index, mmdcPath);

    if (result.success) {
      blocks.push({
        index,
        success: true,
        code: trimmedCode,
        pngBuffer: result.pngBuffer,
        filename: result.filename,
      });
      const placeholder = `MERMAID_DIAGRAM_PLACEHOLDER_${index}`;
      index++;
      return placeholder;
    } else {
      blocks.push({
        index,
        success: false,
        code: trimmedCode,
        error: result.error,
      });
      const placeholder = `MERMAID_ERROR_PLACEHOLDER_${index}`;
      index++;
      return placeholder;
    }
  });

  return { markdown: processedMarkdown, blocks };
}
