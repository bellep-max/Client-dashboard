import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// PORT is only used by the dev server; CI/CD builds don't set it.
// Default to 5173 (the conventional dev port) when unset.
const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH defaults to "/" so builds work without env setup. Override
// in production if the app is served under a sub-path.
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      // Proxy frontend `/api/*` calls to the AEOAdmin customer-portal
      // namespace at `http://localhost:3000/api/portal/*`. Keeping the proxy
      // on the same origin lets the `portal_token` httpOnly cookie attach to
      // localhost:<vite-port> normally — no cross-origin / CORS handling
      // required while developing.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // /api/auth/* is admin's unified auth (express-session connect.sid).
        // Everything else gets auto-scoped via /api/portal/* on the backend.
        rewrite: (urlPath) => {
          if (urlPath.startsWith("/api/auth/")) return urlPath;
          if (urlPath.startsWith("/api/portal/")) return urlPath;
          return urlPath.replace(/^\/api/, "/api/portal");
        },
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
