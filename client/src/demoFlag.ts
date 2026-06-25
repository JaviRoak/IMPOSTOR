// ── NEW FILE: client/src/demoFlag.ts ────────────────────────────────────────
// Single source of truth for demo detection, shared by App.tsx and socket.ts.
// Active only on dev builds AND with ?demo in the URL.
export const IS_DEMO: boolean =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo');
