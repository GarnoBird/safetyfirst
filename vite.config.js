import { defineConfig } from "vite";

// GitHub Pages serves this project from /safetyfirst/.
// Local Vite dev keeps / so http://127.0.0.1:5173/ still works.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/safetyfirst/" : "/",
}));
