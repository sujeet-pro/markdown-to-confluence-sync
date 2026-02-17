import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AgentConfig {
  skillDir: string;
  skillSubDir: string;
  description: string;
}

const SUPPORTED_AGENTS: Record<string, AgentConfig> = {
  claude: {
    skillDir: join(homedir(), ".claude", "skills"),
    skillSubDir: "md2cf",
    description: "Claude Code",
  },
  codex: {
    skillDir: join(homedir(), ".codex", "skills"),
    skillSubDir: "md2cf",
    description: "Codex",
  },
  gemini: {
    skillDir: join(homedir(), ".gemini", "skills"),
    skillSubDir: "md2cf",
    description: "Gemini",
  },
};

function getSkillContent(): string {
  // Try to find the bundled SKILL.md relative to this file
  const candidates = [
    resolve(__dirname, "..", "..", "skills", "md2cf", "SKILL.md"),
    resolve(__dirname, "..", "skills", "md2cf", "SKILL.md"),
    resolve(__dirname, "skills", "md2cf", "SKILL.md"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf-8");
    }
  }

  // Fallback: return embedded skill content
  return getEmbeddedSkillContent();
}

function getEmbeddedSkillContent(): string {
  return `---
name: md2cf
description: >
  Sync markdown files to Confluence pages. Use this skill when asked to publish,
  sync, upload, read, or update markdown content on Confluence, or when the user
  provides a *atlassian.net/wiki/* URL. Handles creating new pages, updating
  existing pages, reading pages as markdown, diff-based partial updates, panels
  (GFM alerts), expand/collapse sections, and nesting pages under parents. The
  primary workflow when given a Confluence URL is: read the page, modify locally,
  write back. Keywords: confluence, wiki, markdown, publish, sync, read, diff,
  merge, atlassian, documentation, init, panels, expand, callouts.
license: MIT
compatibility: Requires md2cf CLI to be installed globally (npm install -g md2cf) and configured (md2cf config). Requires Node.js >= 24.
metadata:
  author: sujeet-pro
  version: "3.0"
---

## Instructions

Use the \`md2cf\` CLI tool to sync markdown files to Confluence pages. The tool converts Markdown to Atlassian Document Format (ADF) and uses the Confluence REST API v2.

### Prerequisites

The user must have md2cf installed and configured before this skill can be used:

\`\`\`bash
npm install -g md2cf
md2cf config
\`\`\`

Configuration requires: Atlassian email, API token (from https://id.atlassian.com/manage/api-tokens), and Confluence base URL.

### Commands

#### Update an existing Confluence page (default)

\`\`\`bash
md2cf <markdown-file-or-url> <page-url>
\`\`\`

#### Create a new page

\`\`\`bash
md2cf <source> <space-url> --create
md2cf <source> <page-url> --create    # creates as child page
\`\`\`

#### Read a page as Markdown

\`\`\`bash
md2cf read <page-url>                  # prints to stdout
md2cf read <page-url> --output out.md  # writes to file
\`\`\`

#### Scaffold a sample markdown file

\`\`\`bash
md2cf init
\`\`\`

### Options

| Option | Description |
|--------|-------------|
| \`-c, --create\` | Create a new page (as child if URL is a page, in space if URL is a space) |
| \`--title <title>\` | Override page title (defaults to first H1 heading in the markdown) |
| \`--strategy <s>\` | Merge strategy: \`auto-merge\`, \`local-wins\` (default), \`remote-wins\`, \`append\` |
| \`--dry-run\` | Preview what would happen without making changes |
| \`-y, --yes\` | Skip confirmation prompts (for CI/scripts) |
| \`--skip-mermaid\` | Skip mermaid diagram rendering |

### Merge Strategies

| Strategy | Behavior |
|----------|----------|
| \`local-wins\` | Full replacement with local content (default, current behavior) |
| \`auto-merge\` | Line-level merge: keeps non-conflicting changes from both sides, prefers local for conflicts |
| \`remote-wins\` | Keep remote content, discard local changes |
| \`append\` | Concatenate local content after existing remote content |

### Configuration Commands

\`\`\`bash
md2cf config              # Interactive setup
md2cf config set <k> <v>  # Set a value (email, token, baseUrl)
md2cf config get <key>    # Get a value
md2cf config list         # List all config (token masked)
md2cf config reset        # Delete all config
md2cf config path         # Show config file location
\`\`\`

### Source Types

The \`<source>\` argument accepts:
- **Local file path**: \`./docs/guide.md\`, \`README.md\`
- **Local folder path**: \`./docs/\` (synced recursively)
- **Remote URL**: \`https://raw.githubusercontent.com/org/repo/main/docs/guide.md\`

### Folder Sync

When the source is a folder, md2cf mirrors the local structure to Confluence:
- Folders become container pages
- Markdown files become pages
- Existing pages are updated, new pages are created

### Title Resolution

1. \`--title\` flag value (if provided)
2. First \`# H1\` heading in the markdown content
3. Filename converted to title case

## Agent Workflows

**Primary workflow:** When the user provides a Confluence URL (\`*atlassian.net/wiki/*\`), the default approach is to read the page, modify it locally, then write it back. Always start with \`md2cf read\` unless the user explicitly asks to create a new page.

### Read, Modify, Update

Read an existing Confluence page, modify its content, then sync back:

\`\`\`bash
# 1. Read the current page content
md2cf read https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --output page.md

# 2. Modify page.md as needed (edit, append, etc.)

# 3. Sync back with auto-merge to preserve any concurrent changes
md2cf page.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --strategy auto-merge -y
\`\`\`

### Split Page into Children

Read a large page, break it into sections, and create child pages:

\`\`\`bash
# 1. Read the parent page
md2cf read https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --output parent.md

# 2. Split content into separate files (e.g., section1.md, section2.md)

# 3. Create child pages
md2cf section1.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --create -y
md2cf section2.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --create -y
\`\`\`

### Generate from Template

\`\`\`bash
# 1. Generate a sample markdown file
md2cf init

# 2. Edit confluence-sample.md to match your content

# 3. Sync to Confluence
md2cf confluence-sample.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 -y
\`\`\`

### Append Content to a Page

\`\`\`bash
# Add new content to the end of an existing page
md2cf new-section.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --strategy append -y
\`\`\`

## Writing Confluence-Friendly Markdown

Supported features: headings (H1-H6), bold, italic, strikethrough, inline code, code blocks with language, bullet lists, numbered lists, nested lists, tables, links, images, blockquotes, horizontal rules, Table of Contents sections (auto-converted to Confluence TOC macro), mermaid diagrams (requires mmdc), panels/callouts via GFM alert syntax (\`> [!NOTE]\`, \`> [!TIP]\`, \`> [!IMPORTANT]\`, \`> [!WARNING]\`, \`> [!CAUTION]\`), expand/collapse sections via \`:::expand Title ... :::\` syntax.

Avoid: raw HTML, footnotes, task lists (GFM checkboxes), definition lists, math blocks. These are not converted to ADF.

## Examples

**Update a page:**
\`\`\`bash
md2cf ./README.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
\`\`\`

**Read a page:**
\`\`\`bash
md2cf read https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
\`\`\`

**Create a child page:**
\`\`\`bash
md2cf ./api-docs.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --create
\`\`\`

**Auto-merge update:**
\`\`\`bash
md2cf ./doc.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --strategy auto-merge -y
\`\`\`

**Sync entire folder:**
\`\`\`bash
md2cf ./docs/ https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
\`\`\`
`;
}

/** Installs the md2cf SKILL.md file for a given AI agent (claude, codex, gemini). */
export function installSkill(agentName: string): void {
  const normalizedName = agentName.toLowerCase();
  const agentConfig = SUPPORTED_AGENTS[normalizedName];

  if (!agentConfig) {
    const supported = Object.keys(SUPPORTED_AGENTS).join(", ");
    console.error(chalk.red(`Unsupported agent: ${agentName}. Supported agents: ${supported}`));
    process.exit(1);
  }

  const targetDir = join(agentConfig.skillDir, agentConfig.skillSubDir);
  const targetFile = join(targetDir, "SKILL.md");

  // Create directory
  mkdirSync(targetDir, { recursive: true });

  // Write skill file
  const content = getSkillContent();
  writeFileSync(targetFile, content, "utf-8");

  console.log(chalk.green.bold(`\nSkill installed for ${agentConfig.description}!`));
  console.log(chalk.dim(`Location: ${targetFile}`));
  console.log();
  console.log(chalk.cyan("The agent can now use md2cf commands to sync markdown to Confluence."));
}

/** Returns the list of supported agent names for skill installation. */
export function getSupportedAgents(): string[] {
  return Object.keys(SUPPORTED_AGENTS);
}
