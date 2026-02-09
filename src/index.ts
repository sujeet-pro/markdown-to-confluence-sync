export { ConfluenceClient } from "./lib/confluence.js";
export {
  convertMarkdownToAdf,
  extractTitle,
  titleFromFilename,
  injectMermaidAdf,
} from "./lib/converter.js";
export type { AttachmentMap } from "./lib/converter.js";
export {
  findMmdc,
  renderMermaidToPng,
  hasMermaidBlocks,
  processMermaidBlocks,
} from "./lib/mermaid.js";
export {
  readMarkdownSource,
  isUrl,
  readLocalFile,
  fetchRemoteFile,
  isDirectory,
  readFolderStructure,
} from "./lib/markdown.js";
export type { FileEntry, FolderStructure } from "./lib/markdown.js";
export {
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
} from "./lib/config.js";
export {
  parseConfluenceUrl,
  buildApiBaseUrl,
  buildPageWebUrl,
  extractPageId,
} from "./lib/url-parser.js";

export {
  Md2cfConfigSchema,
  PartialMd2cfConfigSchema,
  SyncOptionsSchema,
  ParsedConfluenceUrlSchema,
} from "./lib/schemas.js";

export type {
  Md2cfConfig,
  ConfluencePage,
  ConfluenceSpace,
  ParsedConfluenceUrl,
  SyncOptions,
  SyncResult,
  AdfDocument,
  AdfNode,
  AdfMark,
  MermaidBlock,
  MermaidProcessResult,
  AttachmentUploadResult,
} from "./lib/types.js";
