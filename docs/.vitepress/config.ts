import { defineConfig } from "vitepress";

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
  ],

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/library" },
      { text: "Contributing", link: "/contributing" },
      {
        text: "v1.0.0",
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
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Configuration", link: "/guide/configuration" },
          ],
        },
        {
          text: "Usage",
          items: [
            { text: "Core Usage", link: "/guide/usage" },
            { text: "Folder Sync", link: "/guide/folder-sync" },
            { text: "Mermaid Diagrams", link: "/guide/mermaid" },
            { text: "CI / Automation", link: "/guide/ci-automation" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "Library API", link: "/api/library" },
            { text: "URL Formats", link: "/api/url-formats" },
          ],
        },
      ],
      "/integrations/": [
        {
          text: "Integrations",
          items: [{ text: "AI Agents", link: "/integrations/ai-agents" }],
        },
      ],
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
