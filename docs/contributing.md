---
outline: deep
---

# Contributing

Thank you for your interest in contributing to md2cf!

## Prerequisites

- Node.js >= 24.0.0
- npm >= 11.0.0
- Git

## Development setup

1. Fork the repository on GitHub.
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/markdown-to-confluence-sync.git
   cd markdown-to-confluence-sync
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Available scripts

| Command                  | Description                    |
| ------------------------ | ------------------------------ |
| `npm run dev`            | Watch mode for development     |
| `npm run build`          | Build the project              |
| `npm test`               | Run tests                      |
| `npm run test:watch`     | Tests in watch mode            |
| `npm run test:coverage`  | Tests with coverage report     |
| `npm run lint`           | Lint the code                  |
| `npm run lint:fix`       | Lint and auto-fix              |
| `npm run format`         | Format code with Prettier      |
| `npm run format:check`   | Check code formatting          |
| `npm run typecheck`      | TypeScript type checking       |

## Submitting pull requests

1. Ensure code follows the existing style (ESLint + Prettier).
2. Write or update tests for your changes.
3. All tests pass: `npm test`
4. Coverage thresholds are met: `npm run test:coverage` (90%+)
5. Linting passes: `npm run lint`
6. Types check: `npm run typecheck`
7. Write a clear commit message following Conventional Commits.

## Commit message format

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

Examples:

```
feat(sync): add support for batch syncing multiple files
fix(converter): handle nested lists correctly
docs: update installation instructions
```

## Code style

- TypeScript with strict mode
- ESM modules (`"type": "module"`)
- Double quotes, semicolons required
- 100 character line width, trailing commas
- Run `npm run format` before committing

## Testing guidelines

- Write tests for all new functionality
- Maintain 90%+ coverage (branches, functions, lines, statements)
- Use Vitest with mocked external dependencies
- Place tests in `tests/unit/` with `.test.ts` extension

## Project structure

```
src/
  cli/                 # CLI entry point and commands
    commands/          # Individual command implementations
  lib/                 # Core library modules
tests/
  unit/                # Unit tests (mirrors src/ structure)
skills/
  md2cf/               # Agent skill definition
```

## Release process

Releases are managed via GitHub Actions:

1. Go to **Actions** > **Release** workflow.
2. Click **Run workflow** and select version type (major / minor / patch).
3. The workflow runs CI checks, bumps the version, publishes to npm, and creates a GitHub Release.

## Questions?

Open an issue or start a discussion on [GitHub](https://github.com/sujeet-pro/markdown-to-confluence-sync/issues).
