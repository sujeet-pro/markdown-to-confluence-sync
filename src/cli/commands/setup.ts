import { Command } from "commander";
import { execSync } from "node:child_process";
import chalk from "chalk";
import { findMmdc, renderMermaidToPng } from "../../lib/mermaid.js";

interface DiagnosticCheck {
  label: string;
  status: "pass" | "fail";
  detail: string;
  fix?: string;
}

const TEST_DIAGRAM = "graph TD\n  A[Start] --> B[End]";

/** Run all diagnostic checks and return results. */
export function runDiagnostics(): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];

  // Check 1: mmdc binary found
  const mmdcPath = findMmdc();
  if (mmdcPath) {
    checks.push({ label: "mmdc binary", status: "pass", detail: mmdcPath });
  } else {
    checks.push({
      label: "mmdc binary",
      status: "fail",
      detail: "not found",
      fix: "npm install -g md2cf  (or: npm install -g @mermaid-js/mermaid-cli)",
    });
    return checks; // No point continuing without mmdc
  }

  // Check 2: mmdc version
  try {
    const version = execSync(`"${mmdcPath}" --version`, {
      encoding: "utf8",
      timeout: 10000,
    }).trim();
    checks.push({ label: "mmdc version", status: "pass", detail: version });
  } catch (err) {
    checks.push({
      label: "mmdc version",
      status: "fail",
      detail: (err as Error).message,
      fix: "Reinstall @mermaid-js/mermaid-cli",
    });
  }

  // Check 3: test render
  const result = renderMermaidToPng(TEST_DIAGRAM, 999, mmdcPath);
  if (result.success) {
    checks.push({ label: "Mermaid test render", status: "pass", detail: "OK" });
  } else {
    const isBrowserError =
      /chrome|chromium|browser|puppeteer|no\s+usable\s+sandbox/i.test(result.error);
    checks.push({
      label: "Mermaid test render",
      status: "fail",
      detail: result.error,
      fix: isBrowserError
        ? "npx puppeteer browsers install chrome"
        : "Check the error above and ensure mmdc can run",
    });
  }

  return checks;
}

/** Print diagnostic results to stdout. */
export function printDiagnostics(checks: DiagnosticCheck[]): void {
  console.log();
  console.log(chalk.bold("md2cf Diagnostics"));
  console.log();

  for (const check of checks) {
    if (check.status === "pass") {
      console.log(chalk.green("  \u2714 ") + `${check.label}: ${check.detail}`);
    } else {
      console.log(chalk.red("  \u2716 ") + `${check.label}: ${check.detail}`);
    }
  }

  console.log();

  const failures = checks.filter((c) => c.status === "fail");
  if (failures.length === 0) {
    console.log(chalk.green.bold("All checks passed!"));
  } else {
    for (const f of failures) {
      if (f.fix) {
        console.log(chalk.yellow("  To fix:"), f.fix);
      }
    }
  }
}

export function createSetupCommand(): Command {
  return new Command("setup")
    .description("Check md2cf dependencies (mermaid rendering, browser, etc.)")
    .action(() => {
      const checks = runDiagnostics();
      printDiagnostics(checks);
      const hasFailure = checks.some((c) => c.status === "fail");
      if (hasFailure) {
        process.exit(1);
      }
    });
}
