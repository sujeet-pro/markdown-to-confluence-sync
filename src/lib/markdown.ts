import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join, extname, basename } from "node:path";

/**
 * Check whether a source string is a URL.
 */
export function isUrl(source: string): boolean {
  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Read markdown content from a local file.
 */
export function readLocalFile(filePath: string): string {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return readFileSync(resolved, "utf-8");
}

/**
 * Fetch markdown content from a remote URL.
 */
export async function fetchRemoteFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Read markdown from either a local file path or a remote URL.
 */
export async function readMarkdownSource(source: string): Promise<string> {
  if (isUrl(source)) {
    return fetchRemoteFile(source);
  }
  return readLocalFile(source);
}

/**
 * Check if a path is a directory.
 */
export function isDirectory(path: string): boolean {
  try {
    const resolved = resolve(path);
    return existsSync(resolved) && statSync(resolved).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Represents a file entry in a folder structure.
 */
export interface FileEntry {
  path: string;
  relativePath: string;
  name: string;
  isMarkdown: boolean;
}

/**
 * Represents a folder structure with files and subfolders.
 */
export interface FolderStructure {
  name: string;
  path: string;
  relativePath: string;
  files: FileEntry[];
  subfolders: FolderStructure[];
}

/**
 * Recursively read a folder structure with all markdown files.
 */
export function readFolderStructure(
  folderPath: string,
  baseFolder: string = folderPath,
): FolderStructure {
  const resolved = resolve(folderPath);
  const baseResolved = resolve(baseFolder);

  if (!existsSync(resolved)) {
    throw new Error(`Folder not found: ${resolved}`);
  }

  if (!statSync(resolved).isDirectory()) {
    throw new Error(`Not a directory: ${resolved}`);
  }

  const entries = readdirSync(resolved, { withFileTypes: true });
  const files: FileEntry[] = [];
  const subfolders: FolderStructure[] = [];

  for (const entry of entries) {
    const fullPath = join(resolved, entry.name);
    const relativePath = fullPath.replace(baseResolved, "").replace(/^\//, "");

    if (entry.isDirectory()) {
      // Skip hidden directories and common ignore patterns
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }
      const subfolder = readFolderStructure(fullPath, baseResolved);
      subfolders.push(subfolder);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      files.push({
        path: fullPath,
        relativePath,
        name: entry.name,
        isMarkdown: ext === ".md" || ext === ".markdown",
      });
    }
  }

  return {
    name: basename(resolved),
    path: resolved,
    relativePath: resolved.replace(baseResolved, "").replace(/^\//, "") || ".",
    files,
    subfolders,
  };
}
