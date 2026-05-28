import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Install a global fetch shim that rewrites portal data calls
// (`/api/businesses`, `/api/keywords`, etc.) to their backend `/api/portal/...`
// equivalents. Auth calls (`/api/auth/...`) and already-prefixed calls
// (`/api/portal/...`) pass through untouched.
//
// This mirrors the dev-time Vite proxy rewrite so the same source code works in
// production where the admin-panel (under `/admin/*`) shares the origin and
// owns the un-prefixed `/api/*` namespace via Vercel rewrites.
//
// Both the generated @workspace/api-client-react and ad-hoc fetch callers in
// this app go through window.fetch, so a single point of interception covers
// every data-layer code path.
(() => {
  const originalFetch = window.fetch.bind(window);

  function rewritePath(pathAndQuery: string): string {
    if (pathAndQuery.startsWith("/api/auth/")) return pathAndQuery;
    if (pathAndQuery.startsWith("/api/portal/")) return pathAndQuery;
    if (pathAndQuery.startsWith("/api/")) {
      return "/api/portal/" + pathAndQuery.slice("/api/".length);
    }
    return pathAndQuery;
  }

  function rewriteUrl(url: string): string {
    // Same-origin relative path — rewrite directly.
    if (url.startsWith("/")) return rewritePath(url);

    // Same-origin absolute URL (e.g. when a VITE_API_URL base prepends the
    // current origin). Only rewrite if it actually targets the current origin
    // and hits the /api namespace.
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/")) {
        return parsed.origin + rewritePath(parsed.pathname) + parsed.search + parsed.hash;
      }
    } catch {
      // Not a parseable URL — leave it alone.
    }
    return url;
  }

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      return originalFetch(rewriteUrl(input), init);
    }
    if (input instanceof URL) {
      return originalFetch(rewriteUrl(input.toString()), init);
    }
    // Request object — rebuild only if the URL actually needs rewriting.
    const rewritten = rewriteUrl(input.url);
    if (rewritten === input.url) {
      return originalFetch(input, init);
    }
    return originalFetch(new Request(rewritten, input), init);
  };
})();

createRoot(document.getElementById("root")!).render(<App />);
