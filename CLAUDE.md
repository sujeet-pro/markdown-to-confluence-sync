# CLAUDE.md

## Project Overview

**md2cf** is a CLI tool and library that syncs Markdown files to Confluence Cloud pages. It converts Markdown to Atlassian Document Format (ADF) via [marklassian](https://github.com/jamsinclair/marklassian) and uses the Confluence REST API v2.

## Commands

```bash
npm run dev          # Watch mode (vite build --watch)
npm run build        # Production build (vite build + tsc declarations)
npm test             # Run tests (vitest run)
npm run test:watch   # Watch mode tests
npm run test:coverage # Tests with coverage (90% thresholds)
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm run format       # Prettier format
npm run format:check # Prettier check
```

**Quality gate (run before committing):**
```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Architecture

```
src/
  cli/
    index.ts                 # CLI entry point (Commander.js)
    commands/
      sync.ts                # Sync command (single file + folder)
      config.ts              # Config subcommand (set/get/list/reset/path)
      install-skill.ts       # --install-skill handler
  lib/
    config.ts                # Config management (~/.md2cf/config.json)
    confluence.ts            # ConfluenceClient (REST API v2)
    converter.ts             # Markdown → ADF conversion
    markdown.ts              # File/URL/folder reading
    schemas.ts               # Zod validation schemas
    types.ts                 # TypeScript interfaces
    url-parser.ts            # Confluence URL parsing
  index.ts                   # Library public API (re-exports)
tests/
  unit/                      # Vitest unit tests (mirrors src/ structure)
skills/
  md2cf/SKILL.md             # Agent skill definition
```

## Coding Conventions

- **ESM only** — `"type": "module"` in package.json
- **Strict TypeScript** — `strict: true` in tsconfig
- **Double quotes** for strings
- **Semicolons** required
- **100 char** line width
- **Trailing commas** everywhere
- **Vite** for bundling (two entry points: `cli.js` and `index.js`)
- **Vitest** for testing with `globals: true`

## Testing Patterns

- All external dependencies are mocked (`vi.mock()`)
- Filesystem: mock `node:fs` functions
- Network: mock global `fetch` via `vi.stubGlobal("fetch", mockFetch)`
- Spinners: mock `ora` to return chainable stub
- Prompts: mock `@inquirer/prompts`
- Coverage thresholds: 90% for branches, functions, lines, statements
- `mockReset: true` and `restoreMocks: true` in vitest config

## Key Design Decisions

- Positional args: `md2cf <source> <url>` (not `md2cf sync --to`)
- URL parsing determines action: page URL = update, space URL = create (with `--create`)
- Folder sync creates folder pages as containers for child pages
- Config stored at `~/.md2cf/config.json`
- Pre-flight access check before any sync operation
- Overwrite protection prompts user before updating (skip with `--yes`)
- `--dry-run` skips all API calls and prints what would happen
