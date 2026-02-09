# md2cf

A CLI tool to sync Markdown files to Confluence pages.

[![npm version](https://img.shields.io/npm/v/md2cf.svg)](https://www.npmjs.com/package/md2cf)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

md2cf converts Markdown to [Atlassian Document Format (ADF)](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) and publishes it to Confluence Cloud using the [REST API v2](https://developer.atlassian.com/cloud/confluence/rest/v2/intro/). It supports creating new pages, updating existing ones, and nesting pages under parents.

## Features

- 📄 Sync local or remote Markdown files to Confluence
- 📁 **Recursive folder sync** - mirrors your local folder structure to Confluence
- ✨ Create new pages or update existing ones
- 🌳 Nest pages under parent pages
- 🔄 Automatic Markdown to ADF conversion via [marklassian](https://github.com/jamsinclair/marklassian)
- 🎯 Smart title detection from H1 headings or filenames
- 🤖 AI agent skill installation (`--install-skill claude`)
- 📚 Usable as both a CLI tool and a library

## Installation

```bash
npm install -g md2cf
```

Requires **Node.js >= 18**.

## Quick Start

```bash
# 1. Configure credentials
md2cf config

# 2. Update an existing page
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345

# 3. Create a new page in a space
md2cf ./docs/guide.md https://company.atlassian.net/wiki/spaces/ENG --create

# 4. Create a page as child of another page
md2cf ./api.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --create
```

## Configuration

Run the interactive setup:

```bash
md2cf config
```

You'll be prompted for:

| Setting | Description |
|---------|-------------|
| **email** | Your Atlassian account email |
| **token** | API token from https://id.atlassian.com/manage/api-tokens |
| **baseUrl** | Your Confluence instance URL (e.g., `https://company.atlassian.net`) |

Configuration is stored in `~/.md2cf/config.json`.

### Manual configuration

```bash
md2cf config set email user@company.com
md2cf config set token YOUR_API_TOKEN
md2cf config set baseUrl https://company.atlassian.net
```

### Other config commands

```bash
md2cf config list       # Show current config (token masked)
md2cf config get email  # Get a specific value
md2cf config reset      # Delete all configuration
md2cf config path       # Show config file path
```

## Usage

The CLI intelligently determines the action based on the URL and flags:

- **No `--create` flag**: Updates the page at the URL
- **With `--create` flag**:
  - If URL points to a page → creates a new child page
  - If URL points to a space → creates a new page in that space

### Update an existing page

```bash
md2cf <source> <page-url>
```

**Examples:**

```bash
# Update a page
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345

# With custom title
md2cf ./README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --title "Custom Title"

# From remote markdown
md2cf https://raw.githubusercontent.com/org/repo/main/README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345
```

### Create a new page

```bash
# Create in space root
md2cf <source> <space-url> --create

# Create as child of a page
md2cf <source> <page-url> --create
```

**Examples:**

```bash
# Create in space root
md2cf ./onboarding.md https://company.atlassian.net/wiki/spaces/ENG --create

# Short flag version
md2cf ./guide.md https://company.atlassian.net/wiki/spaces/ENG -c

# Create as child of a page
md2cf ./api-docs.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --create

# With custom title
md2cf ./doc.md https://company.atlassian.net/wiki/spaces/ENG --create --title "My Page"
```

### Sync entire folders recursively

```bash
md2cf <folder> <page-or-space-url>
```

When the source is a folder, md2cf automatically mirrors your local folder structure to Confluence:
- Folders become pages (with default content)
- Markdown files become pages
- Nested folder structure is preserved as parent-child page relationships
- Existing pages are updated, new pages are created

**Examples:**

```bash
# Sync ./docs/ folder to a parent page
md2cf ./docs/ https://company.atlassian.net/wiki/spaces/ENG/pages/12345

# Sync to space root
md2cf ./documentation/ https://company.atlassian.net/wiki/spaces/DOCS
```

**Folder structure example:**
```
docs/
  README.md              → Page "README" under parent
  api/
    auth.md              → Page "auth" under "api" folder page
    users.md             → Page "users" under "api" folder page
  guides/
    getting-started.md   → Page "getting-started" under "guides" folder page
```

This creates:
- Page "README" (child of target page)
- Page "api" (folder page, child of target page)
  - Page "auth" (child of "api")
  - Page "users" (child of "api")
- Page "guides" (folder page, child of target page)
  - Page "getting-started" (child of "guides")

### Options

| Option | Description |
|--------|-------------|
| `-c, --create` | Create a new page (as child if URL is a page, in space if URL is a space) |
| `--title <title>` | Page title (defaults to first H1 heading, then filename). Only applies to single file sync. |
| `--dry-run` | Preview what would happen without making changes |
| `-y, --yes` | Skip confirmation prompts (for CI/scripts) |

### Title resolution

The page title is determined in order:

1. `--title` flag value (if provided)
2. First `# H1` heading in the markdown
3. Filename converted to title case (e.g., `getting-started.md` becomes "Getting Started")

## Supported Confluence URL formats

```
https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345/Page+Title
https://domain.atlassian.net/wiki/spaces/SPACE/pages/12345
https://domain.atlassian.net/wiki/spaces/SPACE
```

## AI Agent Integration

Install the md2cf skill so AI coding agents can sync Markdown to Confluence:

```bash
md2cf --install-skill claude
```

This installs a [SKILL.md](https://agentskills.io/) file that teaches the agent how to use md2cf commands.

**Supported agents:** `claude`, `codex`, `gemini`

## Library API

md2cf also exports its core modules for programmatic use:

```javascript
import { ConfluenceClient, convertMarkdownToAdf, readMarkdownSource } from "md2cf";

const markdown = await readMarkdownSource("./doc.md");
const adf = convertMarkdownToAdf(markdown);

const client = new ConfluenceClient(baseUrl, email, token);
await client.createPage(spaceId, "My Page", adf);
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

Full documentation is available at https://sujeet-pro.github.io/markdown-to-confluence-sync/

## License

[MIT](LICENSE)
