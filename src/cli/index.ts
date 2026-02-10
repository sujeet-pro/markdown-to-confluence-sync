import { Command } from "commander";
import chalk from "chalk";
import { input } from "@inquirer/prompts";
import { syncAction } from "./commands/sync.js";
import { createConfigCommand } from "./commands/config.js";
import { createSetupCommand } from "./commands/setup.js";
import { installSkill, getSupportedAgents } from "./commands/install-skill.js";
import type { SyncOptions } from "../lib/types.js";

const program = new Command();

program
  .name("md2cf")
  .description("Sync Markdown files to Confluence pages")
  .version("1.0.0")
  .argument("[source]", "Path to markdown file/folder or URL to remote markdown")
  .argument("[url]", "Confluence page or space URL")
  .option(
    "-c, --create",
    "Create a new page (as child if URL is a page, in space if URL is a space)",
  )
  .option("--title <title>", "Page title (defaults to first H1 or filename)")
  .option("--dry-run", "Preview what would happen without making changes")
  .option("-y, --yes", "Skip confirmation prompts (for CI/scripts)")
  .option("--skip-mermaid", "Skip mermaid diagram rendering (leave code blocks as-is)")
  .option(
    "--install-skill <agent>",
    `Install md2cf skill for an AI agent (${getSupportedAgents().join(", ")})`,
  )
  .action(async (source?: string, url?: string, opts?: SyncOptions & { installSkill?: string }) => {
    // Handle --install-skill
    if (opts?.installSkill) {
      installSkill(opts.installSkill);
      process.exit(0);
    }

    // Interactive prompts when arguments are missing
    if (!source) {
      source = await input({
        message: "Path to markdown file/folder or URL:",
        validate: (val) => (val.length > 0 ? true : "Source is required"),
      });
    }

    if (!url) {
      url = await input({
        message: "Confluence page or space URL:",
        validate: (val) => {
          try {
            new URL(val);
            return true;
          } catch {
            return "Please enter a valid URL";
          }
        },
      });
    }

    try {
      const syncOpts: SyncOptions = {
        url,
        create: opts?.create,
        title: opts?.title,
        dryRun: opts?.dryRun,
        yes: opts?.yes,
        skipMermaid: (opts as Record<string, unknown>)?.skipMermaid as boolean | undefined,
      };

      const result = await syncAction(source, syncOpts);
      console.log();
      console.log(chalk.green.bold(`Page ${result.action} successfully!`));
      console.log(chalk.dim("Title: ") + result.title);
      console.log(chalk.dim("ID:    ") + result.pageId);
      if (result.pageUrl) {
        console.log(chalk.dim("URL:   ") + chalk.underline(result.pageUrl));
      }
    } catch (err) {
      console.error();
      console.error(chalk.red.bold("Error:"), (err as Error).message);
      process.exit(1);
    }
  });

program.addCommand(createConfigCommand());
program.addCommand(createSetupCommand());

// Custom help footer
program.addHelpText(
  "after",
  `
${chalk.bold("Examples:")}
  ${chalk.dim("# Configure credentials")}
  $ md2cf config

  ${chalk.dim("# Update an existing page")}
  $ md2cf README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345

  ${chalk.dim("# Create a new page in a space")}
  $ md2cf docs/guide.md https://company.atlassian.net/wiki/spaces/ENG --create

  ${chalk.dim("# Sync entire folder recursively (mirrors folder structure)")}
  $ md2cf ./docs/ https://company.atlassian.net/wiki/spaces/ENG/pages/12345

  ${chalk.dim("# Override the page title")}
  $ md2cf README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345 --title "Custom Title"

  ${chalk.dim("# Sync from a remote URL")}
  $ md2cf https://raw.githubusercontent.com/org/repo/main/README.md https://company.atlassian.net/wiki/spaces/ENG/pages/12345

  ${chalk.dim("# Check mermaid rendering setup")}
  $ md2cf setup

  ${chalk.dim("# Install skill for Claude Code")}
  $ md2cf --install-skill claude
`,
);

program.parse();
