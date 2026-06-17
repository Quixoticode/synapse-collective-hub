# SynMail — Setup-Konzept

SynMail nutzt **zwei separate Wege** für Versand und Empfang:

## Versand (Brevo)

- Server-Function `mailSend` schickt POST an `https://connector-gateway.lovable.dev/brevo/smtp/email`.
- Header: `Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${BREVO_API_KEY}`.
- **Setup**: Brevo-Connector im Lovable-Workspace verknüpfen → `BREVO_API_KEY` wird automatisch als Secret hinterlegt.
- Absender-Domain muss in Brevo verifiziert sein. Für Tests `onboarding@resend.dev` o. ä. nicht möglich – bei Brevo eigene Domain einrichten.

## Empfang (Cloudflare Email Routing → Worker → Webhook)

### Schritt 1 — Cloudflare Email Routing aktivieren
1. Cloudflare-Dashboard → Domain → **Email → Email Routing**.
2. MX/SPF/DKIM/DMARC einrichten lassen (assistierter Flow).
3. Routing-Rule: `*@deine-domain.de` → **Send to a Worker** → Worker `syn-mail-relay`.

### Schritt 2 — Worker deployen

```js
// syn-mail-relay (Cloudflare Email Worker)
import PostalMime from "postal-mime";

export default {
  async email(message, env) {
    const raw = new Response(message.raw);
    const parsed = await new PostalMime().parse(await raw.arrayBuffer());

    await fetch(env.SYNCRM_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-syn-mail-secret": env.SYNCRM_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        to: message.to,
        from: message.from,
        subject: parsed.subject,
        text: parsed.text,
        html: parsed.html,
        cc: (parsed.cc || []).map((a) => a.address),
        message_id: parsed.messageId,
      }),
    });
  },
};
```

`wrangler.toml` für den Email-Worker:

```toml
name = "syn-mail-relay"
main = "src/index.js"
compatibility_date = "2024-11-06"

[vars]
SYNCRM_WEBHOOK_URL = "https://project--e8d5373e-fee4-41ff-9107-d77a6d43158f.lovable.app/api/public/mail/cf-inbound"

# Secret separat setzen:
# wrangler secret put SYNCRM_WEBHOOK_SECRET
```

### Schritt 3 — Webhook-Secret in SynCRM

Im SynCRM-Projekt das Secret `CF_EMAIL_WEBHOOK_SECRET` hinterlegen (gleicher Wert wie `SYNCRM_WEBHOOK_SECRET` im Worker).

### Schritt 4 — Postfach in SynCRM anlegen

Im Mail-Tab `+` → E-Mail-Adresse eintragen (z. B. `jake@deine-domain.de`).
Sobald die erste Mail eingeht, taucht sie im Eingang auf.

## Sicherheit

- Webhook verifiziert per Shared-Secret im Header.
- Eingehende Mails ohne passendes Postfach werden mit `404` abgewiesen.
- Versand prüft serverseitig SLID+PIK und ob der Anrufer Eigentümer des Postfachs ist (Superuser dürfen fremde Postfächer verwenden).
