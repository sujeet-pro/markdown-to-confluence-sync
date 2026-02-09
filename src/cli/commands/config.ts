import { Command } from "commander";
import chalk from "chalk";
import { input, password } from "@inquirer/prompts";
import {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  resetConfig,
  maskToken,
  getConfigPath,
} from "../../lib/config.js";
import type { Md2cfConfig } from "../../lib/types.js";

const VALID_KEYS: (keyof Md2cfConfig)[] = ["email", "token", "baseUrl"];

function isValidKey(key: string): key is keyof Md2cfConfig {
  return VALID_KEYS.includes(key as keyof Md2cfConfig);
}

async function interactiveSetup(): Promise<void> {
  const existing = loadConfig();

  console.log(chalk.bold("\nmd2cf Configuration Setup\n"));
  console.log(chalk.dim("Configure your Confluence credentials.\n"));

  const email = await input({
    message: "Atlassian account email:",
    default: existing.email,
    validate: (val) => (val.includes("@") ? true : "Please enter a valid email address"),
  });

  const token = await password({
    message: "API token (from https://id.atlassian.com/manage/api-tokens):",
    validate: (val) => (val.length > 0 ? true : "Token is required"),
  });

  const baseUrl = await input({
    message: "Confluence base URL (e.g., https://company.atlassian.net):",
    default: existing.baseUrl,
    validate: (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return "Please enter a valid URL";
      }
    },
  });

  saveConfig({ email, token, baseUrl });
  console.log(chalk.green("\nConfiguration saved to " + getConfigPath()));
}

function listConfig(): void {
  const config = loadConfig();
  const keys = Object.keys(config) as (keyof Md2cfConfig)[];

  if (keys.length === 0) {
    console.log(chalk.yellow("No configuration found. Run `md2cf config` to set up."));
    return;
  }

  console.log(chalk.bold("\nCurrent configuration:\n"));
  for (const key of keys) {
    const value = config[key];
    if (!value) continue;
    const displayValue = key === "token" ? maskToken(value) : value;
    console.log(`  ${chalk.cyan(key)}: ${displayValue}`);
  }
  console.log();
  console.log(chalk.dim(`Config file: ${getConfigPath()}`));
}

/** Creates the `md2cf config` subcommand with set/get/list/reset/path actions. */
export function createConfigCommand(): Command {
  const cmd = new Command("config")
    .description("Configure md2cf credentials and settings")
    .action(async () => {
      await interactiveSetup();
    });

  cmd
    .command("set <key> <value>")
    .description("Set a configuration value (email, token, baseUrl)")
    .action((key: string, value: string) => {
      if (!isValidKey(key)) {
        console.error(chalk.red(`Invalid key: ${key}. Valid keys: ${VALID_KEYS.join(", ")}`));
        process.exit(1);
      }
      setConfigValue(key, value);
      console.log(chalk.green(`Set ${key} successfully.`));
    });

  cmd
    .command("get <key>")
    .description("Get a configuration value")
    .action((key: string) => {
      if (!isValidKey(key)) {
        console.error(chalk.red(`Invalid key: ${key}. Valid keys: ${VALID_KEYS.join(", ")}`));
        process.exit(1);
      }
      const value = getConfigValue(key);
      if (!value) {
        console.log(chalk.yellow(`${key} is not set.`));
      } else {
        const display = key === "token" ? maskToken(value) : value;
        console.log(display);
      }
    });

  cmd
    .command("list")
    .description("List all configuration values")
    .action(() => {
      listConfig();
    });

  cmd
    .command("reset")
    .description("Reset all configuration")
    .action(() => {
      resetConfig();
      console.log(chalk.green("Configuration reset successfully."));
    });

  cmd
    .command("path")
    .description("Show the configuration file path")
    .action(() => {
      console.log(getConfigPath());
    });

  return cmd;
}
