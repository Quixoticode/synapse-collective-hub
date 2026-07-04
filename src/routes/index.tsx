import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const has = !!localStorage.getItem("syn.session.v1");
    throw redirect({ to: has ? "/home" : "/auth" });
  },
  component: () => null,
});
