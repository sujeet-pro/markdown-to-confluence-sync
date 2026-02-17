/**
 * Configuration stored in ~/.md2cf/config.json
 */
export interface Md2cfConfig {
  email: string;
  token: string;
  baseUrl: string;
}

/**
 * Confluence page as returned by the v2 API
 */
export interface ConfluencePage {
  id: string;
  status: string;
  title: string;
  spaceId: string;
  parentId?: string;
  parentType?: string;
  version?: {
    number: number;
    message?: string;
    minorEdit?: boolean;
    authorId?: string;
    createdAt?: string;
  };
  body?: {
    atlas_doc_format?: {
      value: string;
      representation: string;
    };
    storage?: {
      value: string;
      representation: string;
    };
  };
  _links?: {
    webui?: string;
    editui?: string;
    tinyui?: string;
    base?: string;
  };
}

/**
 * Confluence folder as returned by the v2 API
 */
export interface ConfluenceFolder {
  id: string;
  type: "folder";
  title: string;
  spaceId: string;
  parentId?: string;
  parentType?: string;
}

/**
 * Confluence space as returned by the v2 API
 */
export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  homepageId?: string;
  _links?: {
    webui?: string;
  };
}

/**
 * Parsed components from a Confluence URL
 */
export interface ParsedConfluenceUrl {
  baseUrl: string;
  spaceKey?: string;
  pageId?: string;
  /** True when the URL points to a folder rather than a page */
  isFolder?: boolean;
}

/**
 * Merge strategy for diff-based sync
 */
export type MergeStrategy = "auto-merge" | "local-wins" | "remote-wins" | "append";

/**
 * Result of a merge operation
 */
export interface MergeResult {
  markdown: string;
  hasConflicts: boolean;
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

/**
 * Options for the sync command
 */
export interface SyncOptions {
  url?: string;
  create?: boolean;
  title?: string;
  dryRun?: boolean;
  yes?: boolean;
  skipMermaid?: boolean;
  strategy?: MergeStrategy;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  pageId: string;
  pageUrl: string;
  action: "created" | "updated";
  title: string;
}

/**
 * ADF document structure
 */
export interface AdfDocument {
  version: 1;
  type: "doc";
  content: AdfNode[];
}

export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  marks?: AdfMark[];
  text?: string;
}

export interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * Confluence API error response
 */
export interface ConfluenceApiError {
  errors?: Array<{
    status: number;
    code: string;
    title: string;
    detail?: string;
  }>;
  message?: string;
  statusCode?: number;
}

/**
 * Confluence API paginated response for spaces
 */
export interface ConfluenceSpacesResponse {
  results: ConfluenceSpace[];
  _links?: {
    next?: string;
  };
}

/**
 * Confluence API paginated response for pages
 */
export interface ConfluencePagesResponse {
  results: ConfluencePage[];
  _links?: {
    next?: string;
  };
}

/**
 * A GFM alert block (> [!NOTE], > [!TIP], etc.) extracted from markdown
 */
export interface PanelBlock {
  index: number;
  panelType: "info" | "success" | "note" | "warning" | "error";
  contentMarkdown: string;
}

/**
 * An expand/collapse block (:::expand Title ... :::) extracted from markdown
 */
export interface ExpandBlock {
  index: number;
  title: string;
  contentMarkdown: string;
}

/**
 * A processed mermaid code block extracted from markdown
 */
export interface MermaidBlock {
  index: number;
  success: boolean;
  code: string;
  pngBuffer?: Buffer;
  filename?: string;
  error?: string;
}

/**
 * Result of uploading an attachment to Confluence
 */
export interface AttachmentUploadResult {
  success: boolean;
  fileId?: string;
  collectionName?: string;
  error?: string;
}

/**
 * Result of processing mermaid blocks in markdown
 */
export interface MermaidProcessResult {
  markdown: string;
  blocks: MermaidBlock[];
}
