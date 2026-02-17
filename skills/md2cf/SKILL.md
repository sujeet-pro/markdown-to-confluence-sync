---
name: md2cf
description: >
  Sync markdown files to Confluence pages. Use this skill when asked to publish,
  sync, read, or upload markdown content to Confluence, or when the user provides
  a *atlassian.net/wiki/* URL. Handles creating new pages, updating existing pages,
  reading pages as markdown, diff sync with merge strategies, panels (GFM alerts),
  expand/collapse sections, and scaffolding new pages with init. The primary workflow
  when given a Confluence URL is: read the page, modify locally, write back.
  Keywords: confluence, wiki, markdown, publish, sync, read, diff sync, init,
  atlassian, documentation, panels, expand, callouts.
license: MIT
compatibility: Requires md2cf CLI to be installed globally (npm install -g md2cf) and configured (md2cf config). Requires Node.js >= 24.
metadata:
  author: sujeet-pro
  version: "3.0"
---

## Instructions

Use the `md2cf` CLI tool to sync markdown files to Confluence pages. The tool converts Markdown to Atlassian Document Format (ADF) and uses the Confluence REST API v2. It also supports reading Confluence pages back as Markdown, merging changes with strategies, and scaffolding new files.

### Prerequisites

The user must have md2cf installed and configured before this skill can be used:

```bash
npm install -g md2cf
md2cf config
```

Configuration requires: Atlassian email, API token (from https://id.atlassian.com/manage/api-tokens), and Confluence base URL.

Verify the installation (including mermaid rendering) with:

```bash
md2cf setup
```

### Commands

The CLI provides three main commands: sync (default), read, and init.

#### Sync: Update an existing page (default)

```bash
md2cf <markdown-file-or-url> <page-url>
```

The URL must be a full Confluence page URL. This is the default mode. The tool fetches the existing page, prompts for confirmation, and updates it.

#### Sync: Create a new page

```bash
# Create in a space root
md2cf <source> <space-url> --create

# Create as child of an existing page
md2cf <source> <page-url> --create

# Short flag
md2cf <source> <url> -c
```

The `--create` flag determines the action:
- If URL points to a page, creates a new child page under it
- If URL points to a space, creates a new page in that space root

#### Read: Get a Confluence page as Markdown

```bash
# Print to stdout
md2cf read <page-url>

# Write to a file
md2cf read <page-url> --output page.md
md2cf read <page-url> -o page.md
```

The `read` command fetches a Confluence page, converts its ADF content to Markdown, and outputs the result. Use `--output` to write directly to a file instead of stdout.

#### Init: Scaffold a sample file

```bash
md2cf init
```

Creates `confluence-sample.md` in the current directory. This file demonstrates all Markdown features supported by md2cf (headings, lists, tables, code blocks, TOC, mermaid diagrams, panels, expand/collapse). Use it as a starting point for new pages or as a reference for supported syntax.

### Options

| Option | Description |
|--------|-------------|
| `-c, --create` | Create a new page (as child if URL is a page, in space if URL is a space) |
| `--title <title>` | Override page title (defaults to first H1 heading in the markdown) |
| `--dry-run` | Preview what would happen without making changes |
| `-y, --yes` | Skip confirmation prompts (for CI/scripts) |
| `--skip-mermaid` | Skip mermaid diagram rendering (leave code blocks as-is) |
| `--strategy <strategy>` | Merge strategy for updates: `auto-merge`, `local-wins`, `remote-wins`, `append` |
| `-o, --output <file>` | Write output to a file (for the `read` command) |

### Merge Strategies

When updating a page, you can control how local changes are merged with remote content using `--strategy`:

| Strategy | Behavior |
|----------|----------|
| `auto-merge` | Keeps non-conflicting changes from both sides. Conflicts are resolved by preferring local. |
| `local-wins` | Replaces remote content entirely with local content. This is the default behavior (no strategy flag needed). |
| `remote-wins` | Keeps the remote content, discarding local changes. Useful for reverting. |
| `append` | Appends local content below the existing remote content, separated by a horizontal rule. |

Example:

```bash
md2cf page.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --strategy auto-merge --yes
```

### Configuration Commands

```bash
md2cf config              # Interactive setup
md2cf config set <k> <v>  # Set a value (email, token, baseUrl)
md2cf config get <key>    # Get a value
md2cf config list         # List all config (token masked)
md2cf config reset        # Delete all config
md2cf config path         # Show config file location
```

### Setup Command

```bash
md2cf setup
```

Runs diagnostics to verify that mermaid rendering works. Checks for the mmdc binary, its version, and performs a test render. If any check fails, it prints instructions for fixing the issue.

### Source Types

The `<source>` argument accepts:
- **Local file path**: `./docs/guide.md`, `README.md`, `/absolute/path/file.md`
- **Local folder path**: `./docs/`, `/absolute/path/to/folder/` (automatically synced recursively)
- **Remote URL**: `https://raw.githubusercontent.com/org/repo/main/docs/guide.md`

### Folder Sync

When the source is a folder, md2cf automatically syncs it recursively:
- Mirrors the local folder structure to Confluence
- Folders become container pages (with default content)
- Markdown files become pages
- Existing pages with matching titles are updated, new pages are created
- Nested folder structure is preserved as parent-child page relationships

### Title Resolution

The page title is determined in this order:
1. `--title` flag value (if provided)
2. First `# H1` heading in the markdown content
3. Filename converted to title case (e.g., `getting-started.md` becomes "Getting Started")

### Writing Confluence-Friendly Markdown

Quick reference of features that convert cleanly to Confluence:

**Supported:**
- Headings H1 through H6 (H1 becomes the page title)
- Bold (`**text**`), italic (`*text*`), strikethrough (`~~text~~`)
- Inline code (`` `code` ``) and fenced code blocks with language
- Bullet lists, numbered lists, and nested lists
- Pipe-delimited tables
- Links (`[text](url)`) and images (`![alt](url)`)
- Blockquotes (`> text`)
- Horizontal rules (`---`)
- Table of Contents sections (auto-converted to Confluence TOC macro)
- Mermaid diagrams (rendered as PNG attachments when mmdc is available)
- Panels / callouts via GFM alert syntax (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`)
- Expand / collapse sections via `:::expand Title ... :::` syntax

**Avoid:**
- Raw HTML tags (not converted to ADF)
- Task lists / checkboxes (`- [ ]` renders as plain text)
- Footnotes, definition lists, emoji shortcodes
- Merged cells or complex table features
- Reference-style links (may not resolve correctly)

## Agent Workflows

**Primary workflow:** When the user provides a Confluence URL (`*atlassian.net/wiki/*`), the default approach is to read the page, modify it locally, then write it back. Always start with `md2cf read` unless the user explicitly asks to create a new page.

### Read, Modify, Update

Use this workflow to edit an existing Confluence page:

1. Read the current page content:
   ```bash
   md2cf read https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --output page.md
   ```

2. Modify `page.md` as needed (edit sections, add content, fix formatting).

3. Write the changes back:
   ```bash
   md2cf page.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --yes
   ```

For partial changes where the remote page may have been edited by others, use a merge strategy:

```bash
md2cf page.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --strategy auto-merge --yes
```

### Split Page into Children

Use this workflow to break a large page into smaller child pages:

1. Read the parent page:
   ```bash
   md2cf read https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --output parent.md
   ```

2. Analyze the content and split it into separate Markdown files, one per section.

3. Create each child page under the parent:
   ```bash
   md2cf section-1.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --create --title "Section One" --yes
   md2cf section-2.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --create --title "Section Two" --yes
   md2cf section-3.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --create --title "Section Three" --yes
   ```

4. Optionally update the parent page to contain only a summary with links to the children.

### Generate from Template

Use this workflow to scaffold a new page from the sample template:

1. Generate the sample file:
   ```bash
   md2cf init
   ```

2. Read `confluence-sample.md` and modify it for the target content.

3. Sync to Confluence:
   ```bash
   md2cf confluence-sample.md https://mycompany.atlassian.net/wiki/spaces/ENG --create --title "New Page Title" --yes
   ```

### Bulk Sync from a Folder

Use this workflow to sync an entire documentation tree:

1. Organize Markdown files in a folder structure:
   ```
   docs/
     README.md
     api/
       auth.md
       endpoints.md
     guides/
       getting-started.md
   ```

2. Sync the entire folder:
   ```bash
   md2cf ./docs/ https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
   ```

3. The folder structure is mirrored in Confluence:
   - `docs/README.md` becomes a child page of 123456
   - `docs/api/` becomes a container page "Api" with children "Auth" and "Endpoints"
   - `docs/guides/` becomes a container page "Guides" with child "Getting Started"

## Examples

**Update a page from a local file:**
```bash
md2cf ./README.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
```

**Update with custom title:**
```bash
md2cf ./README.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --title "Custom Title"
```

**Create a page in a space root:**
```bash
md2cf ./onboarding.md https://mycompany.atlassian.net/wiki/spaces/ENG --create
```

**Create a child page under an existing page:**
```bash
md2cf ./api-docs.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --create
```

**Sync from a remote URL:**
```bash
md2cf https://raw.githubusercontent.com/org/repo/main/README.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
```

**Sync entire folder recursively:**
```bash
md2cf ./docs/ https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
```

**Read a page as Markdown:**
```bash
md2cf read https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
```

**Read a page and save to file:**
```bash
md2cf read https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --output page.md
```

**Update with auto-merge strategy:**
```bash
md2cf page.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --strategy auto-merge --yes
```

**Append content to an existing page:**
```bash
md2cf additions.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --strategy append --yes
```

**Scaffold a new file and sync it:**
```bash
md2cf init
# Edit confluence-sample.md
md2cf confluence-sample.md https://mycompany.atlassian.net/wiki/spaces/ENG --create --yes
```

**Dry run to preview changes:**
```bash
md2cf page.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --dry-run
```

**Skip mermaid rendering:**
```bash
md2cf page.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --skip-mermaid
```

**Install skill for an AI agent:**
```bash
md2cf --install-skill claude
md2cf --install-skill codex
md2cf --install-skill gemini
```

## Edge Cases

- If no URL is provided to the sync command, the CLI prompts interactively for both source and URL.
- For updates (no `--create` flag), the URL must point to an existing page. Space URLs are not accepted.
- For creates with `--create` flag, the URL can point to either a page (creates as child) or a space (creates in space root).
- The `read` command requires a page URL. Space URLs are not supported for reading.
- Remote markdown URLs must be publicly accessible or return content without authentication.
- Title defaults to the first H1 heading in the markdown, or the filename if no H1 is found.
- The `--strategy` flag only applies to updates (not creates). When creating a page, the flag is ignored.
- If `confluence-sample.md` already exists when running `md2cf init`, the command prints a warning and does not overwrite.
- Mermaid rendering requires mmdc to be available. If mmdc is not found and `--skip-mermaid` is not set, the command fails with instructions to run `md2cf setup`.
- The `--yes` flag skips the overwrite confirmation prompt. Always use it in CI pipelines and automated agent workflows.
