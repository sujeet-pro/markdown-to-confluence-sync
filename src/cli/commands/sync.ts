import ora from "ora";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { getFullConfig } from "../../lib/config.js";
import { readMarkdownSource, isDirectory, readFolderStructure } from "../../lib/markdown.js";
import {
  convertMarkdownToAdf,
  extractTitle,
  titleFromFilename,
  injectMermaidAdf,
  type AttachmentMap,
} from "../../lib/converter.js";
import { ConfluenceClient } from "../../lib/confluence.js";
import { parseConfluenceUrl, buildPageWebUrl } from "../../lib/url-parser.js";
import { hasMermaidBlocks, processMermaidBlocks, findMmdc } from "../../lib/mermaid.js";
import { adfToMarkdown } from "../../lib/adf-to-markdown.js";
import { mergeMarkdown } from "../../lib/differ.js";
import type { SyncOptions, SyncResult, AdfDocument, MermaidBlock } from "../../lib/types.js";

/** Main sync entry point — reads markdown, converts to ADF, and creates/updates Confluence pages. */
async function syncAction(source: string, options: SyncOptions): Promise<SyncResult> {
  const config = getFullConfig();
  const client = new ConfluenceClient(config.baseUrl, config.email, config.token);

  if (!options.url) {
    throw new Error("You must provide a Confluence URL (page or space).");
  }

  // Pre-flight access check
  const accessSpinner = ora("Verifying Confluence access...").start();
  try {
    await client.checkAccess();
    accessSpinner.succeed("Confluence access verified");
  } catch (err) {
    accessSpinner.fail("Confluence access check failed");
    throw err;
  }

  // Check if source is a directory
  if (isDirectory(source)) {
    return handleFolderSync(source, client, config.baseUrl, options);
  }

  // Single file sync
  const spinner = ora("Reading markdown source...").start();
  let markdown: string;
  try {
    markdown = await readMarkdownSource(source);
    spinner.succeed("Markdown source loaded");
  } catch (err) {
    spinner.fail("Failed to read markdown source");
    throw err;
  }

  // Process mermaid blocks if present
  let mermaidBlocks: MermaidBlock[] = [];
  const originalMarkdown = markdown;
  if (hasMermaidBlocks(markdown) && !options.skipMermaid) {
    const mmdcPath = findMmdc();
    if (!mmdcPath) {
      spinner.fail("Mermaid diagrams found but mmdc is not installed");
      throw new Error(
        'mmdc binary not found. Run "md2cf setup" to diagnose, or reinstall md2cf. ' +
          "Use --skip-mermaid to sync without rendering diagrams.",
      );
    }
    spinner.start("Rendering mermaid diagrams...");
    const mermaidResult = processMermaidBlocks(markdown, mmdcPath);
    markdown = mermaidResult.markdown;
    mermaidBlocks = mermaidResult.blocks;
    const successCount = mermaidBlocks.filter((b) => b.success).length;
    const failCount = mermaidBlocks.filter((b) => !b.success).length;
    if (failCount > 0) {
      spinner.fail(`${failCount}/${mermaidBlocks.length} mermaid diagrams failed to render`);
      const errors = mermaidBlocks
        .filter((b) => !b.success)
        .map((b) => `  Diagram ${b.index}: ${b.error}`)
        .join("\n");
      throw new Error(
        `Mermaid rendering failed:\n${errors}\n\n` +
          'Run "md2cf setup" to diagnose. Use --skip-mermaid to sync without rendering diagrams.',
      );
    }
    spinner.succeed(`Rendered ${successCount} mermaid diagram(s)`);
  }

  // Convert to ADF
  spinner.start("Converting markdown to ADF...");
  const adf = convertMarkdownToAdf(markdown);
  spinner.succeed("Converted to ADF");

  // Determine title (use original markdown to find H1 before placeholders)
  const title = options.title || extractTitle(originalMarkdown) || titleFromFilename(source);

  // Parse URL to determine if it's a page or space
  const parsed = parseConfluenceUrl(options.url);

  // Dry-run mode: skip API calls, print what would happen
  if (options.dryRun) {
    spinner.start("Dry run mode — no changes will be made");
    spinner.succeed("Dry run mode — no changes will be made");
    console.log(chalk.dim("  Source:  ") + source);
    console.log(chalk.dim("  URL:     ") + options.url);
    console.log(chalk.dim("  Title:   ") + title);
    console.log(chalk.dim("  Action:  ") + (options.create ? "create" : "update"));
    if (mermaidBlocks.length > 0) {
      console.log(chalk.dim("  Mermaid: ") + `${mermaidBlocks.length} diagram(s)`);
    }
    return {
      success: true,
      pageId: parsed.pageId || "N/A",
      pageUrl: options.url,
      action: options.create ? "created" : "updated",
      title,
    };
  }

  // Route based on --create flag and URL type
  let result: SyncResult;
  if (options.create) {
    result = await handleCreate(client, config.baseUrl, parsed, title, adf, spinner);
  } else {
    result = await handleUpdate(
      client,
      config.baseUrl,
      parsed,
      title,
      adf,
      spinner,
      options,
      markdown,
    );
  }

  // Two-pass mermaid: upload attachments then re-update page with media references
  const successfulMermaidBlocks = mermaidBlocks.filter((b) => b.success && b.pngBuffer);
  if (successfulMermaidBlocks.length > 0) {
    await uploadMermaidAndUpdatePage(client, result.pageId, title, adf, mermaidBlocks, spinner);
  }

  return result;
}

async function handleUpdate(
  client: ConfluenceClient,
  baseUrl: string,
  parsed: ReturnType<typeof parseConfluenceUrl>,
  title: string,
  adf: ReturnType<typeof convertMarkdownToAdf>,
  spinner: ReturnType<typeof ora>,
  options: SyncOptions,
  localMarkdown: string,
): Promise<SyncResult> {
  if (!parsed.pageId) {
    throw new Error(
      "URL must point to a specific page for updates. To create a new page, use --create flag.",
    );
  }

  spinner.start("Fetching existing page...");
  const existing = await client.getPage(parsed.pageId);
  spinner.succeed(`Found page: "${existing.title}"`);

  // Overwrite protection: prompt for confirmation unless --yes is set
  if (!options.yes) {
    const confirmed = await confirm({
      message: `Overwrite "${existing.title}" (version ${existing.version?.number || 0})?`,
      default: true,
    });
    if (!confirmed) {
      throw new Error("Update cancelled by user.");
    }
  }

  // Strategy-based merge when not using local-wins (default behavior)
  let finalAdf = adf;
  const strategy = options.strategy;
  if (strategy && strategy !== "local-wins") {
    spinner.start("Fetching remote content for merge...");
    const remoteAdfValue = existing.body?.atlas_doc_format?.value;
    if (remoteAdfValue) {
      const remoteAdf = JSON.parse(remoteAdfValue) as AdfDocument;
      const remoteMarkdown = adfToMarkdown(remoteAdf);
      const result = mergeMarkdown(localMarkdown, remoteMarkdown, strategy);
      finalAdf = convertMarkdownToAdf(result.markdown);
      const statsMsg = `+${result.stats.added} -${result.stats.removed} ~${result.stats.unchanged}`;
      if (result.hasConflicts) {
        spinner.warn(`Merged with conflicts (local preferred) [${statsMsg}]`);
      } else {
        spinner.succeed(`Merged successfully [${statsMsg}]`);
      }
    } else {
      spinner.succeed("No remote content — using local content as-is");
    }
  }

  const newVersion = (existing.version?.number || 0) + 1;
  spinner.start("Updating page...");
  const updated = await client.updatePage(parsed.pageId, title, finalAdf, newVersion);
  const pageUrl = updated._links?.webui
    ? buildPageWebUrl(baseUrl, updated._links.webui)
    : buildPageWebUrl(baseUrl, `/wiki/spaces/${parsed.spaceKey}/pages/${parsed.pageId}`);
  spinner.succeed("Page updated successfully");

  return {
    success: true,
    pageId: updated.id,
    pageUrl,
    action: "updated",
    title,
  };
}

async function handleCreate(
  client: ConfluenceClient,
  baseUrl: string,
  parsed: ReturnType<typeof parseConfluenceUrl>,
  title: string,
  adf: ReturnType<typeof convertMarkdownToAdf>,
  spinner: ReturnType<typeof ora>,
): Promise<SyncResult> {
  let spaceId: string;
  let parentId: string | undefined;

  // If URL points to a folder, create as child of that folder
  if (parsed.pageId && parsed.isFolder) {
    spinner.start("Resolving parent folder...");
    const folder = await client.getFolder(parsed.pageId);
    spaceId = folder.spaceId;
    parentId = folder.id;
    spinner.succeed(`Creating in folder: "${folder.title}"`);
  }
  // If URL points to a page, create as child of that page
  else if (parsed.pageId) {
    spinner.start("Resolving parent page...");
    const parentPage = await client.getPage(parsed.pageId);
    spaceId = parentPage.spaceId;
    parentId = parentPage.id;
    spinner.succeed(`Creating as child of: "${parentPage.title}"`);
  }
  // If URL points to a space, create in space root
  else if (parsed.spaceKey) {
    spinner.start(`Resolving space "${parsed.spaceKey}"...`);
    const space = await client.getSpace(parsed.spaceKey);
    spaceId = space.id;
    spinner.succeed(`Space found: "${space.name}"`);
  } else {
    throw new Error(
      "URL must point to either a page (to create as child) or a space (to create in space root).",
    );
  }

  spinner.start("Creating page...");
  const created = await client.createPage(spaceId, title, adf, parentId);
  const pageUrl = created._links?.webui ? buildPageWebUrl(baseUrl, created._links.webui) : "";
  spinner.succeed("Page created successfully");

  return {
    success: true,
    pageId: created.id,
    pageUrl,
    action: "created",
    title,
  };
}

async function handleFolderSync(
  folderPath: string,
  client: ConfluenceClient,
  baseUrl: string,
  options: SyncOptions,
): Promise<SyncResult> {
  const spinner = ora("Reading folder structure...").start();
  const structure = readFolderStructure(folderPath);
  spinner.succeed(`Found ${countMarkdownFiles(structure)} markdown files`);

  // Parse URL to get the root parent
  const parsed = parseConfluenceUrl(options.url!);
  let rootParentId: string;
  let spaceId: string;

  // Get the root parent page/folder
  if (parsed.pageId && parsed.isFolder) {
    spinner.start("Resolving root folder...");
    const folder = await client.getFolder(parsed.pageId);
    rootParentId = folder.id;
    spaceId = folder.spaceId;
    spinner.succeed(`Root folder: "${folder.title}"`);
  } else if (parsed.pageId) {
    spinner.start("Resolving root page...");
    const rootPage = await client.getPage(parsed.pageId);
    rootParentId = rootPage.id;
    spaceId = rootPage.spaceId;
    spinner.succeed(`Root page: "${rootPage.title}"`);
  } else if (parsed.spaceKey) {
    spinner.start(`Resolving space "${parsed.spaceKey}"...`);
    const space = await client.getSpace(parsed.spaceKey);
    spaceId = space.id;
    rootParentId = ""; // No parent for space root
    spinner.succeed(`Space found: "${space.name}"`);
  } else {
    throw new Error("URL must point to either a page or a space for folder sync.");
  }

  // Recursively sync the folder structure
  const result = await syncFolderRecursive(
    structure,
    client,
    spaceId,
    rootParentId || undefined,
    spinner,
  );

  const summarySpinner = ora().start();
  summarySpinner.succeed(
    `Folder sync complete: ${result.created} created, ${result.updated} updated`,
  );

  return {
    success: true,
    pageId: rootParentId || spaceId,
    pageUrl: buildPageWebUrl(
      baseUrl,
      parsed.pageId
        ? `/wiki/spaces/${parsed.spaceKey}/pages/${parsed.pageId}`
        : `/wiki/spaces/${parsed.spaceKey}`,
    ),
    action: "updated",
    title: structure.name,
  };
}

function countMarkdownFiles(structure: ReturnType<typeof readFolderStructure>): number {
  let count = structure.files.filter((f) => f.isMarkdown).length;
  for (const subfolder of structure.subfolders) {
    count += countMarkdownFiles(subfolder);
  }
  return count;
}

interface SyncStats {
  created: number;
  updated: number;
}

async function syncFolderRecursive(
  structure: ReturnType<typeof readFolderStructure>,
  client: ConfluenceClient,
  spaceId: string,
  parentId: string | undefined,
  spinner: ReturnType<typeof ora>,
): Promise<SyncStats> {
  const stats: SyncStats = { created: 0, updated: 0 };

  // Sync markdown files in current folder
  for (const file of structure.files) {
    if (!file.isMarkdown) continue;

    const markdown = await readMarkdownSource(file.path);
    const adf = convertMarkdownToAdf(markdown);
    const title = extractTitle(markdown) || titleFromFilename(file.name);

    spinner.start(`Syncing: ${file.relativePath}`);

    // Try to find existing page by title
    const existing = await client.findPageByTitle(spaceId, title);

    if (existing) {
      // Update existing page
      const newVersion = (existing.version?.number || 0) + 1;
      await client.updatePage(existing.id, title, adf, newVersion);
      stats.updated++;
      spinner.succeed(`Updated: ${file.relativePath}`);
    } else {
      // Create new page
      await client.createPage(spaceId, title, adf, parentId);
      stats.created++;
      spinner.succeed(`Created: ${file.relativePath}`);
    }
  }

  // Sync subfolders
  for (const subfolder of structure.subfolders) {
    // Create or find folder page
    spinner.start(`Processing folder: ${subfolder.name}`);
    const folderTitle = titleFromFilename(subfolder.name);
    const existing = await client.findPageByTitle(spaceId, folderTitle);

    let folderId: string;
    if (existing) {
      folderId = existing.id;
      spinner.text = `Using existing folder page: ${folderTitle}`;
    } else {
      // Create empty page for folder
      const emptyAdf = convertMarkdownToAdf(`# ${folderTitle}\n\nThis page contains subpages.`);
      const created = await client.createPage(spaceId, folderTitle, emptyAdf, parentId);
      folderId = created.id;
      stats.created++;
      spinner.succeed(`Created folder page: ${folderTitle}`);
    }

    // Recursively sync subfolder contents
    const subStats = await syncFolderRecursive(subfolder, client, spaceId, folderId, spinner);
    stats.created += subStats.created;
    stats.updated += subStats.updated;
  }

  return stats;
}

/**
 * Upload mermaid PNG attachments to a page, then re-update the page
 * with correct media references in the ADF body.
 */
async function uploadMermaidAndUpdatePage(
  client: ConfluenceClient,
  pageId: string,
  title: string,
  adf: AdfDocument,
  mermaidBlocks: MermaidBlock[],
  spinner: ReturnType<typeof ora>,
): Promise<void> {
  const successfulBlocks = mermaidBlocks.filter((b) => b.success && b.pngBuffer && b.filename);
  if (successfulBlocks.length === 0) return;

  spinner.start("Uploading mermaid diagram attachments...");
  const attachmentMap: AttachmentMap = {};

  for (const block of successfulBlocks) {
    const result = await client.uploadAttachment(pageId, block.filename!, block.pngBuffer!);
    if (result.success && result.fileId) {
      attachmentMap[block.filename!] = {
        fileId: result.fileId,
        collectionName: result.collectionName || `contentId-${pageId}`,
      };
    }
  }

  const uploadedCount = Object.keys(attachmentMap).length;
  if (uploadedCount === 0) {
    spinner.warn("No mermaid attachments were uploaded successfully");
    return;
  }

  spinner.succeed(`Uploaded ${uploadedCount} mermaid attachment(s)`);

  // Re-update the page with correct media references
  spinner.start("Updating page with mermaid diagrams...");
  const updatedAdf = injectMermaidAdf(adf, mermaidBlocks, attachmentMap);
  const currentVersion = await client.getPageVersion(pageId);
  await client.updatePage(
    pageId,
    title,
    updatedAdf,
    currentVersion + 1,
    "Updated mermaid diagrams",
  );
  spinner.succeed("Page updated with mermaid diagrams");
}

export { syncAction };
