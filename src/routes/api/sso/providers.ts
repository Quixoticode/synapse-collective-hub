import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/sso/providers")({
  GET: async () => {
    const env = (globalThis as any).__env__ || {};
    const baseUrl = env.SSO_BASE_URL || "https://sso.xsyna.de";

    const providers = [
      {
        id: "github",
        name: "GitHub",
        icon: "github",
        enabled: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
        authUrl: "https://github.com/login/oauth/authorize",
        scopes: ["read:user", "user:email"],
        brandColor: "#24292e",
      },
      {
        id: "google",
        name: "Google",
        icon: "google",
        enabled: false,
        authUrl: "",
        scopes: ["openid", "email", "profile"],
        brandColor: "#4285F4",
      },
      {
        id: "microsoft",
        name: "Microsoft",
        icon: "microsoft",
        enabled: false,
        authUrl: "",
        scopes: ["openid", "email", "profile"],
        brandColor: "#2F2F2F",
      },
    ];

    return json({
      providers: providers.filter((p) => p.enabled),
      allProviders: providers,
      ssoBaseUrl: baseUrl,
      ssoEnabled: true,
    });
  },
});
