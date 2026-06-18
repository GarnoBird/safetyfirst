import { defineConfig } from "vite";

// Vercel serves this app from /. Set VITE_BASE_PATH only for alternate static hosts.
export default defineConfig(() => ({
  base: process.env.VITE_BASE_PATH || "/",
}));
