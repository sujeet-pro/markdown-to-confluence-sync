import { createRequire } from "node:module";
import { defineConfig } from "vitepress";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json");

const sidebar = [
  {
    text: "Introduction",
    items: [
      { text: "Getting Started", link: "/docs/getting-started" },
      { text: "Configuration", link: "/docs/configuration" },
    ],
  },
  {
    text: "Usage",
    items: [
      { text: "Syncing Pages", link: "/docs/usage" },
      { text: "Reading Pages", link: "/docs/reading-pages" },
      { text: "Merge Strategies", link: "/docs/merge-strategies" },
      { text: "Folder Sync", link: "/docs/folder-sync" },
      { text: "Mermaid Diagrams", link: "/docs/mermaid" },
      { text: "CI / Automation", link: "/docs/ci-automation" },
    ],
  },
  {
    text: "Markdown",
    items: [
      { text: "Syntax Reference", link: "/docs/markdown-syntax" },
      { text: "Sample Page", link: "/docs/sample" },
    ],
  },
  {
    text: "Examples",
    items: [{ text: "Common Recipes", link: "/docs/examples" }],
  },
  {
    text: "API Reference",
    items: [
      { text: "Library API", link: "/api/library" },
      { text: "URL Formats", link: "/api/url-formats" },
    ],
  },
  {
    text: "AI Agents",
    items: [
      { text: "Using with Agents", link: "/docs/agents" },
      { text: "Agent Reference", link: "/integrations/ai-agents" },
    ],
  },
  {
    text: "Project",
    items: [{ text: "Contributing", link: "/contributing" }],
  },
];

export default defineConfig({
  title: "md2cf",
  description: "Sync Markdown files to Confluence Cloud pages",
  base: "/markdown-to-confluence-sync/",

  head: [
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:title", content: "md2cf — Markdown to Confluence" }],
    [
      "meta",
      {
        name: "og:description",
        content: "CLI tool and library to sync Markdown files to Confluence Cloud pages",
      },
    ],
    [
      "link",
      {
        rel: "llms-txt",
        href: "/markdown-to-confluence-sync/llms.txt",
      },
    ],
    [
      "link",
      {
        rel: "llms-full-txt",
        href: "/markdown-to-confluence-sync/llms-full.txt",
      },
    ],
  ],

  themeConfig: {
    nav: [
      { text: "Docs", link: "/docs/getting-started" },
      {
        text: `v${pkg.version}`,
        items: [
          {
            text: "Changelog",
            link: "https://github.com/sujeet-pro/markdown-to-confluence-sync/releases",
          },
          {
            text: "npm",
            link: "https://www.npmjs.com/package/md2cf",
          },
        ],
      },
    ],

    sidebar: {
      "/docs/": sidebar,
      "/api/": sidebar,
      "/integrations/": sidebar,
      "/contributing": sidebar,
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/sujeet-pro/markdown-to-confluence-sync",
      },
    ],

    editLink: {
      pattern:
        "https://github.com/sujeet-pro/markdown-to-confluence-sync/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright &copy; 2025 Sujeet Jaiswal",
    },

    search: {
      provider: "local",
    },
  },
});
