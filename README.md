# md2cf

A CLI tool to sync Markdown files to Confluence pages.

[![npm version](https://img.shields.io/npm/v/md2cf.svg)](https://www.npmjs.com/package/md2cf)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)

md2cf converts Markdown to [Atlassian Document Format (ADF)](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) and publishes it to Confluence Cloud using the [REST API v2](https://developer.atlassian.com/cloud/confluence/rest/v2/intro/).

## Quick Start

```bash
# Install
npm install -g md2cf

# Configure credentials
md2cf config

# Update an existing page
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345

# Create a new page
md2cf ./guide.md https://company.atlassian.net/wiki/spaces/ENG --create
```

## Features

- Sync local or remote Markdown files to Confluence
- Read Confluence pages back as Markdown (`md2cf read`)
- Diff-based partial updates with merge strategies (`--strategy`)
- Recursive folder sync mirroring local structure
- Create new pages or update existing ones
- Automatic Markdown to ADF conversion via [marklassian](https://github.com/jamsinclair/marklassian)
- Panels and callouts via GFM alert syntax (`> [!NOTE]`, `> [!TIP]`, etc.)
- Collapsible expand/collapse sections (`:::expand`)
- Mermaid diagram rendering (when mmdc is installed)
- Smart title detection from H1 headings or filenames
- AI agent skill installation (`--install-skill claude`)
- Usable as both a CLI tool and a library

## Usage

### Update an existing page

```bash
md2cf <source> <page-url>
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

### Create a new page

```bash
# In space root
md2cf <source> <space-url> --create

# As child of a page
md2cf <source> <page-url> --create
```

### Read a Confluence page

```bash
# Print to stdout
md2cf read <page-url>

# Save to file
md2cf read <page-url> --output page.md
```

### Diff/merge updates

```bash
# Auto-merge: keeps non-conflicting changes from both sides
md2cf doc.md <page-url> --strategy auto-merge -y

# Append: adds local content after existing page content
md2cf section.md <page-url> --strategy append -y

# Remote wins: keeps remote, discards local
md2cf doc.md <page-url> --strategy remote-wins -y
```

| Strategy | Behavior |
|----------|----------|
| `local-wins` | Full replacement with local content (default) |
| `auto-merge` | Line-level merge, prefers local for conflicts |
| `remote-wins` | Keep remote content |
| `append` | Concatenate local after remote |

### Folder sync

```bash
md2cf ./docs/ https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

Mirrors folder structure to Confluence: folders become container pages, markdown files become pages.

### Initialize a sample file

```bash
md2cf init
```

Creates `confluence-sample.md` with examples of all supported markdown features.

### Options

| Option | Description |
|--------|-------------|
| `-c, --create` | Create a new page |
| `--title <title>` | Override page title |
| `--strategy <s>` | Merge strategy: `auto-merge`, `local-wins`, `remote-wins`, `append` |
| `--dry-run` | Preview without making changes |
| `-y, --yes` | Skip confirmation prompts |
| `--skip-mermaid` | Skip mermaid diagram rendering |

## Configuration

```bash
md2cf config                    # Interactive setup
md2cf config set email user@co.com
md2cf config set token YOUR_TOKEN
md2cf config set baseUrl https://company.atlassian.net
md2cf config list               # Show config (token masked)
md2cf config reset              # Delete all config
```

Configuration is stored in `~/.md2cf/config.json`. You need:
- Atlassian account email
- API token from https://id.atlassian.com/manage/api-tokens
- Confluence instance URL

## AI Agent Integration

Install the md2cf skill so AI coding agents can sync Markdown to Confluence:

```bash
md2cf --install-skill claude
```

Supported agents: `claude`, `codex`, `gemini`

### Agent workflows

**Read, modify, update:**
```bash
md2cf read <page-url> --output page.md
# ... modify page.md ...
md2cf page.md <page-url> --strategy auto-merge -y
```

**Split a page into children:**
```bash
md2cf read <page-url> --output parent.md
# ... split into section1.md, section2.md ...
md2cf section1.md <page-url> --create -y
md2cf section2.md <page-url> --create -y
```

**Append content to a page:**
```bash
md2cf new-section.md <page-url> --strategy append -y
```

## Library API

```javascript
import {
  ConfluenceClient,
  convertMarkdownToAdf,
  readMarkdownSource,
  adfToMarkdown,
  mergeMarkdown,
} from "md2cf";

// Convert and sync
const markdown = await readMarkdownSource("./doc.md");
const adf = convertMarkdownToAdf(markdown);
const client = new ConfluenceClient(baseUrl, email, token);
await client.createPage(spaceId, "My Page", adf);

// Read a page back as markdown
const page = await client.getPage(pageId);
const pageAdf = JSON.parse(page.body.atlas_doc_format.value);
const pageMarkdown = adfToMarkdown(pageAdf);

// Merge content
const merged = mergeMarkdown(localMd, remoteMd, "auto-merge");
```

## Supported URL formats

```
https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345/Page+Title
https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345
https://domain.atlassian.net/wiki/spaces/SPACE
```

## Development

```bash
git clone https://github.com/sujeet-pro/markdown-to-confluence-sync.git
cd markdown-to-confluence-sync
npm install
npm run dev          # Watch mode
npm test             # Run tests
npm run test:coverage # Coverage report
npm run lint         # Lint
npm run typecheck    # Type check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development guidelines.

## Documentation

Full documentation: https://sujeet-pro.github.io/markdown-to-confluence-sync/

Markdown syntax reference: [docs/guide/markdown-syntax.md](docs/guide/markdown-syntax.md)

## License

[MIT](LICENSE)
