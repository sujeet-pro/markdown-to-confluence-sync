# Library API

md2cf exports its core modules so you can use them programmatically in Node.js scripts.

```bash
npm install md2cf
```

```ts
import { ConfluenceClient, convertMarkdownToAdf, readMarkdownSource } from "md2cf";
```

## Quick example

```ts
import { ConfluenceClient, convertMarkdownToAdf, readMarkdownSource } from "md2cf";

const markdown = await readMarkdownSource("./doc.md");
const adf = convertMarkdownToAdf(markdown);

const client = new ConfluenceClient(baseUrl, email, token);
await client.createPage(spaceId, "My Page", adf);
```

---

## ConfluenceClient

HTTP client for the Confluence Cloud REST API v2.

### Constructor

```ts
new ConfluenceClient(baseUrl: string, email: string, token: string)
```

### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `checkAccess` | `() => Promise<void>` | Verify credentials can reach the API |
| `getPage` | `(pageId: string) => Promise<ConfluencePage>` | Fetch a page by numeric ID (includes ADF body) |
| `getSpace` | `(spaceKey: string) => Promise<ConfluenceSpace>` | Fetch a space by its key |
| `findPageByTitle` | `(spaceId: string, title: string) => Promise<ConfluencePage \| null>` | Search for a page by title within a space |
| `createPage` | `(spaceId: string, title: string, adfBody: AdfDocument, parentId?: string) => Promise<ConfluencePage>` | Create a new page, optionally as a child |
| `updatePage` | `(pageId: string, title: string, adfBody: AdfDocument, versionNumber: number, versionMessage?: string) => Promise<ConfluencePage>` | Update an existing page |
| `getPageChildren` | `(pageId: string) => Promise<ConfluencePage[]>` | List child pages of a parent |
| `getPageVersion` | `(pageId: string) => Promise<number>` | Get current version number |
| `uploadAttachment` | `(pageId: string, filename: string, buffer: Buffer) => Promise<AttachmentUploadResult>` | Upload or update a file attachment |

---

## Converter

### `convertMarkdownToAdf(markdown: string): AdfDocument`

Convert a Markdown string to an Atlassian Document Format document via [marklassian](https://github.com/jamsinclair/marklassian).

### `extractTitle(markdown: string): string | null`

Return the first `# H1` heading from the Markdown, or `null` if none found.

### `titleFromFilename(source: string): string`

Derive a page title from a file path or URL. Strips the extension and converts hyphens/underscores to title-cased spaces.

### `injectMermaidAdf(adf: AdfDocument, blocks: MermaidBlock[], attachmentMap: AttachmentMap): AdfDocument`

Replace mermaid placeholder nodes in an ADF tree with rendered images and collapsible source blocks.

---

## Markdown source

### `readMarkdownSource(source: string): Promise<string>`

Read Markdown content from a local file path or a remote URL.

### `isUrl(source: string): boolean`

Check whether a string is an HTTP/HTTPS URL.

### `readLocalFile(filePath: string): string`

Read a local file synchronously. Throws if the file does not exist.

### `fetchRemoteFile(url: string): Promise<string>`

Fetch content from a remote URL.

### `isDirectory(path: string): boolean`

Check if a path is an existing directory.

### `readFolderStructure(folderPath: string, baseFolder?: string): FolderStructure`

Recursively read a folder and return its tree of files and subfolders.

---

## Mermaid

### `findMmdc(): string | null`

Locate the `mmdc` binary (sibling `.bin`, CWD `node_modules`, or global PATH).

### `hasMermaidBlocks(markdown: string): boolean`

Check if a Markdown string contains any `` ```mermaid `` code blocks.

### `renderMermaidToPng(mermaidCode: string, index: number, mmdcPath: string)`

Render a single mermaid block to PNG. Returns `{ success, pngBuffer, filename }` or `{ success: false, error }`.

### `processMermaidBlocks(markdown: string, mmdcPath: string): MermaidProcessResult`

Extract all mermaid blocks, render each to PNG, and replace with placeholders in the Markdown.

---

## Config

### `loadConfig(): Partial<Md2cfConfig>`

Load and validate the config file. Returns an empty object if no file exists.

### `saveConfig(config: Partial<Md2cfConfig>): void`

Validate and save config to `~/.md2cf/config.json`.

### `getConfigValue(key: keyof Md2cfConfig): string | undefined`

Get a single config value.

### `setConfigValue(key: keyof Md2cfConfig, value: string): void`

Set a single config value (merges with existing).

### `validateConfig(): { valid: boolean; missing: string[] }`

Check whether all required fields are present.

### `resetConfig(): void`

Delete the config file.

### `getFullConfig(): Md2cfConfig`

Load and validate the full config. Throws if any required fields are missing.

### `getConfigDir(): string`

Returns the config directory path (`~/.md2cf`).

### `getConfigPath(): string`

Returns the config file path (`~/.md2cf/config.json`).

### `maskToken(token: string): string`

Mask an API token for display (shows first and last 4 characters).

---

## URL parser

### `parseConfluenceUrl(url: string): ParsedConfluenceUrl`

Parse a Confluence URL into `{ baseUrl, spaceKey, pageId? }`. See [URL Formats](./url-formats.md) for supported patterns.

### `buildApiBaseUrl(baseUrl: string): string`

Build the REST API v2 base URL from a Confluence instance URL.

### `buildPageWebUrl(baseUrl: string, webUiPath: string): string`

Build a full web URL for a Confluence page.

### `extractPageId(input: string): string`

Extract a page ID from a URL or raw numeric string.

---

## Schemas

Zod schemas used for runtime validation:

| Export | Validates |
| --- | --- |
| `Md2cfConfigSchema` | Full config (email, token, baseUrl — all required) |
| `PartialMd2cfConfigSchema` | Partial config (all fields optional) |
| `SyncOptionsSchema` | CLI sync options |
| `ParsedConfluenceUrlSchema` | Parsed URL components |

---

## Types

All TypeScript interfaces are exported for use in typed code:

`Md2cfConfig`, `ConfluencePage`, `ConfluenceSpace`, `ParsedConfluenceUrl`, `SyncOptions`, `SyncResult`, `AdfDocument`, `AdfNode`, `AdfMark`, `MermaidBlock`, `MermaidProcessResult`, `AttachmentUploadResult`, `AttachmentMap`, `FileEntry`, `FolderStructure`
