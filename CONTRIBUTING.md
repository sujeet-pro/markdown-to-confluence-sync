# Contributing to md2cf

Thank you for your interest in contributing to md2cf! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/markdown-to-confluence-sync.git
   cd markdown-to-confluence-sync
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode for development |
| `npm run build` | Build the project |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint the code |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run typecheck` | Run TypeScript type checking |

## How to Contribute

### Reporting Bugs

1. Check the [issue tracker](https://github.com/sujeet-pro/markdown-to-confluence-sync/issues) for existing reports
2. If not found, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Node.js version and OS
   - Any relevant error messages or logs

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with the "enhancement" label
3. Describe the feature, its use case, and any proposed implementation

### Submitting Pull Requests

1. Ensure your code follows the existing style (enforced by ESLint and Prettier)
2. Write or update tests for your changes
3. Ensure all tests pass: `npm test`
4. Ensure code coverage thresholds are met: `npm run test:coverage`
5. Ensure linting passes: `npm run lint`
6. Ensure types check: `npm run typecheck`
7. Write a clear commit message following conventional commits format
8. Submit a pull request with a clear description of your changes

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

Examples:
```
feat(sync): add support for batch syncing multiple files
fix(converter): handle nested lists correctly
docs: update installation instructions
test(config): add tests for config validation
```

## Project Structure

```
src/
  cli/                 # CLI entry point and commands
    commands/          # Individual command implementations
      sync.ts          # Sync command (single file + folder)
      config.ts        # Config subcommand (set/get/list/reset/path)
      install-skill.ts # --install-skill handler
    index.ts           # Main CLI setup (Commander.js)
  lib/                 # Core library modules
    config.ts          # Configuration management (~/.md2cf/config.json)
    confluence.ts      # Confluence API client (REST v2)
    converter.ts       # Markdown to ADF conversion
    markdown.ts        # Markdown source reading (file/URL/folder)
    schemas.ts         # Zod validation schemas
    types.ts           # TypeScript type definitions
    url-parser.ts      # Confluence URL parsing
  index.ts             # Library public API (re-exports)
tests/
  unit/                # Unit tests (mirrors src/ structure)
skills/
  md2cf/               # Agent skill definition
```

## Code Style

- TypeScript with strict mode enabled
- ESM modules (`"type": "module"`)
- Double quotes for strings
- Semicolons required
- 100 character line width
- Trailing commas

These are enforced by ESLint and Prettier. Run `npm run format` before committing.

## Testing Guidelines

- Write tests for all new functionality
- Maintain coverage thresholds (90%+ for branches, functions, lines, statements)
- Use Vitest as the test framework
- Mock external dependencies (filesystem, network, etc.)
- Place test files in `tests/unit/` with `.test.ts` extension

## Release Process

Releases are managed via GitHub Actions. To publish a new version:

1. Go to **Actions** → **Release** workflow
2. Click **Run workflow** and select version type (major/minor/patch)
3. The workflow will:
   - Run full CI checks (lint, typecheck, test, build)
   - Bump the version in `package.json`
   - Commit, tag, and push
   - Publish to npm
   - Create a GitHub Release

### Setting up npm publishing

1. Generate an npm access token at https://www.npmjs.com/settings/tokens
2. Add it as a GitHub repository secret named `NPM_TOKEN`
3. The release workflow uses `NODE_AUTH_TOKEN` from this secret

## Questions?

If you have questions about contributing, please open an issue or start a discussion on GitHub.
