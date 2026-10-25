import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHOTO_FOLDERS } from "./content-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

// public/ is Vite's static-passthrough directory — files there are copied
// verbatim to the output root but are intentionally excluded from the
// module graph, so import.meta.glob cannot see into it. This plugin scans
// the four photo folders under public/ at config-load time (dev start and
// build start alike) and exposes the result as a virtual module the app
// imports normally — filenames only, never the photos themselves. Browsers
// can't render HEIC/HEIF, so those are filtered out here rather than in
// the app; JPG/JPEG/PNG only.
function photoManifestPlugin() {
  const virtualId = "virtual:photo-manifest";
  const resolvedId = "\0" + virtualId;
  return {
    name: "photo-manifest",
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      const manifest = {};
      for (const folder of PHOTO_FOLDERS) {
        const dir = path.join(__dirname, "public", folder);
        let entries = [];
        try {
          entries = fs.readdirSync(dir);
        } catch {
          entries = [];
        }
        manifest[folder] = entries
          .filter((name) => PHOTO_EXTENSIONS.has(path.extname(name).toLowerCase()))
          .sort();
      }
      return `export default ${JSON.stringify(manifest)};`;
    },
  };
}

// Minimal preview-only config. Serves the project root as-is so the
// existing terminal-test.jsx / character-stage.jsx / PNG assets are
// used unmodified, at their existing paths.
export default defineConfig({
  plugins: [react(), photoManifestPlugin()],
});
