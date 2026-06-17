// Cloudflare Email Routing → Worker → diese Route.
// Erwartet POST JSON: { secret, to, from, subject, text, html, message_id? }
// Signatur per Shared-Secret im Header `x-syn-mail-secret` ODER im Body.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mail/cf-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CF_EMAIL_WEBHOOK_SECRET;
        if (!expected) return new Response("Webhook secret not configured", { status: 503 });

        const headerSecret = request.headers.get("x-syn-mail-secret");
        const body = await request.json().catch(() => null) as any;
        if (!body) return new Response("Bad request", { status: 400 });

        const provided = headerSecret || body.secret;
        if (provided !== expected) return new Response("Unauthorized", { status: 401 });

        const to = String(body.to || "").toLowerCase();
        const from = String(body.from || "");
        if (!to || !from) return new Response("Missing to/from", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: acc } = await supabaseAdmin
          .from("mail_accounts")
          .select("id")
          .eq("address", to)
          .maybeSingle();
        if (!acc) return new Response("Account not found", { status: 404 });

        const { error } = await supabaseAdmin.from("mail_messages").insert({
          account_id: acc.id,
          direction: "in",
          from_addr: from,
          to_addrs: [to],
          cc_addrs: Array.isArray(body.cc) ? body.cc : [],
          subject: body.subject || null,
          body_text: body.text || null,
          body_html: body.html || null,
          received_at: new Date().toISOString(),
          provider_id: body.message_id || null,
        });
        if (error) return new Response(error.message, { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
