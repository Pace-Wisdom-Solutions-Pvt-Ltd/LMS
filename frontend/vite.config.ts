// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    // strictPort:false lets Vite fall back to the next free port if 5173 is taken.
    port: 5173,
    strictPort: false,
    // Allow *.localhost subdomains for local tenant testing (e.g. org1.localhost:5173)
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor libs into separate chunks so Rollup can
          // process them in parallel and browsers can cache them independently.
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-icons": ["lucide-react"],
          "vendor-pdf": ["jspdf", "html2canvas"],
        },
      },
    },
  },
});
