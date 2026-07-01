// Renders a hidden print layer and triggers window.print with dedicated CSS.
export type ContractTemplate = "vertrag" | "angebot" | "bestaetigung";

export function printContract(opts: {
  template: ContractTemplate;
  title: string;
  body: string;
  meta?: { author?: string; date?: string; recipient?: string };
}) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) { alert("Popup blockiert – bitte erlauben."); return; }
  const label = { vertrag: "VERTRAG", angebot: "ANGEBOT", bestaetigung: "BESTÄTIGUNG" }[opts.template];
  const bodyHtml = escapeHtml(opts.body).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>");
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"/>
<title>${escapeHtml(opts.title)} – ${label}</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  html, body { margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; }
  header { display:flex; align-items:center; justify-content:space-between; border-bottom: 2px solid #00A3FF; padding-bottom: 8mm; margin-bottom: 8mm; }
  .brand { font-weight: 800; letter-spacing: 0.05em; font-size: 14pt; background: linear-gradient(135deg,#00FFD1,#00A3FF,#7B61FF); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .type { text-transform: uppercase; letter-spacing: 0.2em; font-size: 9pt; color: #666; }
  h1 { font-size: 20pt; margin: 0 0 4mm; }
  .meta { color: #555; font-size: 10pt; margin-bottom: 8mm; }
  p { font-size: 11pt; line-height: 1.55; margin: 0 0 4mm; }
  footer { position: fixed; bottom: 12mm; left: 20mm; right: 20mm; font-size: 8pt; color: #888; border-top: 1px solid #eee; padding-top: 4mm; display:flex; justify-content:space-between; }
  .sig { margin-top: 20mm; display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; }
  .sig div { border-top: 1px solid #333; padding-top: 3mm; font-size: 9pt; color: #444; }
</style></head>
<body>
  <header>
    <div class="brand">xSyna Central</div>
    <div class="type">${label}</div>
  </header>
  <h1>${escapeHtml(opts.title)}</h1>
  <div class="meta">
    ${opts.meta?.recipient ? `Empfänger: ${escapeHtml(opts.meta.recipient)}<br/>` : ""}
    ${opts.meta?.author ? `Ersteller: ${escapeHtml(opts.meta.author)}<br/>` : ""}
    Datum: ${escapeHtml(opts.meta?.date ?? new Date().toLocaleDateString("de-DE"))}
  </div>
  <p>${bodyHtml}</p>
  ${opts.template === "vertrag" ? `<div class="sig"><div>Unterschrift Auftraggeber</div><div>Unterschrift xSyna</div></div>` : ""}
  <footer><span>xSyna Central</span><span>Seite <span class="pnum"></span></span></footer>
  <script>window.onload = () => { setTimeout(() => window.print(), 250); };</script>
</body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}
