import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,ico}", "og-image.png", "manifest.webmanifest"],
        globIgnores: ["**/screenshots/**"],
        maximumFileSizeToCacheInBytes: 3_145_728
      },
      includeAssets: ["favicon.svg", "og-image.png"],
      manifest: {
        name: "RutaVivaMythF",
        short_name: "RutaViva",
        description: "Predicción de riesgo vial en Argentina — MythF",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
