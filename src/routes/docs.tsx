import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/docs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Docs – xSyna Central" },
      { name: "description", content: "Öffentliche Dokumentation zu Features und Partnerschaften des xSyna Kollektivs." },
    ],
  }),
  component: DocsLayout,
});

function DocsLayout() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <Outlet />
    </div>
  );
}
