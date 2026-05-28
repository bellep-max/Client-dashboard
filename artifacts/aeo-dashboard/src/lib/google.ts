// Minimal types + helper for Google Identity Services (gsi/client).
// The full library is loaded once from index.html via a <script> tag.

export interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface GoogleButtonConfig {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number | string;
  locale?: string;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, config: GoogleButtonConfig) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

export function getGoogleClientId(): string | null {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (typeof id !== "string" || id.trim() === "") return null;
  return id.trim();
}

// Resolves once `window.google.accounts.id` is available. The gsi/client
// script is loaded async/defer from index.html, so it may not be ready
// when a component first mounts. Polls at 50ms intervals.
export function waitForGoogleScript(timeoutMs = 5000): Promise<GoogleAccountsId> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const gid = window.google?.accounts?.id;
      if (gid) {
        resolve(gid);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Google Identity Services script failed to load"));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}
