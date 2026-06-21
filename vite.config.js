import { defineConfig } from "vite";

// Vercel serves this app from /. Set VITE_BASE_PATH only for alternate static hosts.
export default defineConfig(() => ({
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    // The wiki ships a large generated local-content bundle. Keep the warning
    // threshold above that known chunk so build output only flags unexpected growth.
    chunkSizeWarningLimit: 7500,
  },
}));
