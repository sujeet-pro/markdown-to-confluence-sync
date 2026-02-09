import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";
import { builtinModules } from "node:module";

function shebangPlugin(): Plugin {
  return {
    name: "shebang",
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName === "cli.js" && chunk.type === "chunk") {
          chunk.code = "#!/usr/bin/env node\n" + chunk.code;
        }
      }
    },
  };
}

export default defineConfig({
  build: {
    target: "node18",
    lib: {
      entry: {
        cli: resolve(__dirname, "src/cli/index.ts"),
        index: resolve(__dirname, "src/index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        "commander",
        "chalk",
        "ora",
        "@inquirer/prompts",
        "marklassian",
        "zod",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
  },
  plugins: [shebangPlugin()],
});
