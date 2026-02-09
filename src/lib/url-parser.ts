import type { ParsedConfluenceUrl } from "./types.js";

/**
 * Parse a Confluence page URL into its components.
 *
 * Supported URL formats:
 *   https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345/Page+Title
 *   https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345
 *   https://domain.atlassian.net/wiki/spaces/SPACE/folder/12345
 *   https://domain.atlassian.net/wiki/spaces/SPACE
 */
export function parseConfluenceUrl(url: string): ParsedConfluenceUrl {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const baseUrl = `${parsed.protocol}//${parsed.host}`;
  const pathname = parsed.pathname;

  // Match /wiki/spaces/SPACEKEY/folder/FOLDERID
  const folderMatch = pathname.match(/\/wiki\/spaces\/([^/]+)\/folder\/(\d+)/);
  if (folderMatch) {
    return {
      baseUrl,
      spaceKey: folderMatch[1],
      pageId: folderMatch[2],
      isFolder: true,
    };
  }

  // Match /wiki/spaces/SPACEKEY/pages/PAGEID(/optional-title)
  const pageMatch = pathname.match(/\/wiki\/spaces\/([^/]+)\/pages\/(\d+)/);
  if (pageMatch) {
    return {
      baseUrl,
      spaceKey: pageMatch[1],
      pageId: pageMatch[2],
    };
  }

  // Match /wiki/spaces/SPACEKEY (space-level URL)
  const spaceMatch = pathname.match(/\/wiki\/spaces\/([^/]+)\/?$/);
  if (spaceMatch) {
    return {
      baseUrl,
      spaceKey: spaceMatch[1],
    };
  }

  throw new Error(
    `Could not parse Confluence URL: ${url}. Expected format: https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345 or .../folder/12345`,
  );
}

/**
 * Build the full API base URL for the Confluence v2 REST API.
 */
export function buildApiBaseUrl(baseUrl: string): string {
  const cleaned = baseUrl.replace(/\/+$/, "");
  return `${cleaned}/wiki/api/v2`;
}

/**
 * Build a web URL for a Confluence page.
 */
export function buildPageWebUrl(baseUrl: string, webUiPath: string): string {
  const cleaned = baseUrl.replace(/\/+$/, "");
  return `${cleaned}/wiki${webUiPath}`;
}

/**
 * Extract a page ID from a string that could be a URL or a raw numeric ID.
 */
export function extractPageId(input: string): string {
  if (/^\d+$/.test(input)) {
    return input;
  }
  const parsed = parseConfluenceUrl(input);
  if (!parsed.pageId) {
    throw new Error(`No page ID found in: ${input}`);
  }
  return parsed.pageId;
}
