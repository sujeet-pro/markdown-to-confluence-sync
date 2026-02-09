import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Md2cfConfig } from "./types.js";
import { Md2cfConfigSchema, PartialMd2cfConfigSchema } from "./schemas.js";

const CONFIG_DIR_NAME = ".md2cf";
const CONFIG_FILE_NAME = "config.json";

/** Returns the path to the md2cf configuration directory (~/.md2cf). */
export function getConfigDir(): string {
  return join(homedir(), CONFIG_DIR_NAME);
}

/** Returns the path to the md2cf config file (~/.md2cf/config.json). */
export function getConfigPath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME);
}

/** Loads and validates the config file, returning a partial config (empty object if no file). */
export function loadConfig(): Partial<Md2cfConfig> {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return {};
  }
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);
  return PartialMd2cfConfigSchema.parse(parsed);
}

/** Validates and saves the config to disk. Creates the config directory if needed. */
export function saveConfig(config: Partial<Md2cfConfig>): void {
  const validated = PartialMd2cfConfigSchema.parse(config);
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(getConfigPath(), JSON.stringify(validated, null, 2) + "\n", "utf-8");
}

/** Gets a single config value by key. */
export function getConfigValue(key: keyof Md2cfConfig): string | undefined {
  const config = loadConfig();
  return config[key];
}

/** Sets a single config value by key, merging with existing config. */
export function setConfigValue(key: keyof Md2cfConfig, value: string): void {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

/** Checks whether all required config fields (email, token, baseUrl) are present. */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const config = loadConfig();
  const required: (keyof Md2cfConfig)[] = ["email", "token", "baseUrl"];
  const missing = required.filter((key) => !config[key]);
  return { valid: missing.length === 0, missing };
}

/** Deletes the config file. */
export function resetConfig(): void {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    unlinkSync(configPath);
  }
}

/** Loads and validates the full config, throwing if any required fields are missing. */
export function getFullConfig(): Md2cfConfig {
  const config = loadConfig();
  const result = Md2cfConfigSchema.safeParse(config);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).filter(Boolean);
    throw new Error(
      `Missing required configuration: ${missing.join(", ")}. Run "md2cf config" to set up.`,
    );
  }
  return result.data;
}

/** Masks an API token for display, showing only the first and last 4 characters. */
export function maskToken(token: string): string {
  if (token.length <= 8) {
    return "****";
  }
  return token.slice(0, 4) + "****" + token.slice(-4);
}
