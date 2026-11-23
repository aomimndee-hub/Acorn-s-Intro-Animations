import { defineConfig } from "vite";
import { resolve } from "node:path";

// GitHub Pages serves this project under /<repo>/. The deploy workflow passes
// the exact path through VITE_BASE; locally we default to the repo name.
const base = process.env.VITE_BASE || "/Acorn-s-Intro-Animations/";

function manifest() {
  return {
    name: "Acorn's Intro Animations",
    version: "1.6.0",
    manifest_version: 1,
    description:
      "Cinematic token animations for the whole table: Break Through, All Out Attack, Anchor, Compass, Spica and Sortilege.",
    action: {
      title: "Intro Animations",
      icon: `${base}icon.svg`,
      popover: `${base}index.html`,
      width: 340,
      height: 760,
    },
    background_url: `${base}background.html`,
  };
}

// Emits manifest.json with paths that include the base, so the extension works
// from a sub-path such as https://user.github.io/Repo-Name/manifest.json.
function manifestPlugin() {
  return {
    name: "obr-manifest",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.split("?")[0].endsWith("/manifest.json")) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify(manifest(), null, 2));
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifest(), null, 2),
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [manifestPlugin()],
  server: { cors: { origin: "*" } },
  build: {
    rollupOptions: {
      input: {
        popover: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "background.html"),
        intro: resolve(__dirname, "intro.html"),
        finisher: resolve(__dirname, "finisher.html"),
        anchor: resolve(__dirname, "anchor.html"),
        compass: resolve(__dirname, "compass.html"),
        spica: resolve(__dirname, "spica.html"),
        sortilege: resolve(__dirname, "sortilege.html"),
      },
    },
  },
});
