import { createFileRoute, redirect } from "@tanstack/react-router";

// The old "Apps" launcher grid has been removed; the Startseite dashboard
// (/home) replaces it. Keep the path as a redirect so any old links resolve.
export const Route = createFileRoute("/_authenticated/apps")({
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
});
