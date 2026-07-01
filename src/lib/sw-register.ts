// Guarded service-worker registration.
// Registers ONLY in production and outside Lovable preview iframes.
export function registerSwSafely() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const host = window.location.hostname;
  const bad = /^(id-preview--|preview--)/.test(host)
    || host === "lovableproject.com" || host.endsWith(".lovableproject.com")
    || host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")
    || host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev");
  const inIframe = window !== window.parent;
  const off = new URL(window.location.href).searchParams.get("sw") === "off";
  const isProd = import.meta.env.PROD;
  if (!isProd || bad || inIframe || off) {
    // unregister any stale worker so preview stays clean
    void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => {
      if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister();
    }));
    return;
  }
  navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore */ });
}
