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
  sync, or upload markdown content to Confluence. Handles creating new pages,
  updating existing pages, and nesting pages under parents. Keywords: confluence,
  wiki, markdown, publish, sync, atlassian, documentation.
license: MIT
compatibility: Requires md2cf CLI to be installed globally (npm install -g md2cf) and configured (md2cf config). Requires Node.js >= 18.
metadata:
  author: sujeet-pro
  version: "1.0"
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

The CLI intelligently determines the action based on the URL and flags:
- **No \`--create\` flag**: Updates the page at the URL
- **With \`--create\` flag**:
  - If URL points to a page → creates a new child page
  - If URL points to a space → creates a new page in that space

#### Update an existing Confluence page (default)

\`\`\`bash
md2cf <markdown-file-or-url> <page-url>
\`\`\`

The URL must be a full Confluence page URL. This is the default mode.

#### Create a new page in a space

\`\`\`bash
md2cf <source> <space-url> --create
# or use the short flag
md2cf <source> <space-url> -c
\`\`\`

#### Create a page as child of another page

\`\`\`bash
md2cf <source> <page-url> --create
\`\`\`

### Options

| Option | Description |
|--------|-------------|
| \`-c, --create\` | Create a new page (as child if URL is a page, in space if URL is a space) |
| \`--title <title>\` | Override page title (defaults to first H1 heading in the markdown) |
| \`--dry-run\` | Preview what would happen without making changes |
| \`-y, --yes\` | Skip confirmation prompts (for CI/scripts) |

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
- **Local file path**: \`./docs/guide.md\`, \`README.md\`, \`/absolute/path/file.md\`
- **Local folder path**: \`./docs/\` (automatically synced recursively)
- **Remote URL**: \`https://raw.githubusercontent.com/org/repo/main/docs/guide.md\`

### Folder Sync

When the source is a folder, md2cf automatically syncs it recursively:
- Mirrors the local folder structure to Confluence
- Folders become pages (with default content)
- Markdown files become pages
- Existing pages are updated, new pages are created

### Title Resolution

The page title is determined in this order:
1. \`--title\` flag value (if provided)
2. First \`# H1\` heading in the markdown content
3. Filename converted to title case (e.g., \`getting-started.md\` becomes "Getting Started")

## Examples

**Update a page from a local file:**
\`\`\`bash
md2cf ./README.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
\`\`\`

**Create a page in a space root:**
\`\`\`bash
md2cf ./onboarding.md https://mycompany.atlassian.net/wiki/spaces/ENG --create
\`\`\`

**Create a child page under an existing page:**
\`\`\`bash
md2cf ./api-docs.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456 --create
\`\`\`

**Sync from a remote URL:**
\`\`\`bash
md2cf https://raw.githubusercontent.com/org/repo/main/README.md https://mycompany.atlassian.net/wiki/spaces/ENG/pages/123456
\`\`\`

**Sync entire folder recursively:**
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
