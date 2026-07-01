// ═══════════════════════════════════════════════════════════════════
// Smart Circle Austria — Edge Function "kontakt"
// Nimmt Formulardaten an → speichert in Supabase → versendet E-Mails via Resend.
//
//   • Interne Weiterleitung an: m.manich@team-mt.de, hrzina.a@rittal.at
//   • Eingangsbestätigung (Auto-Antwort) an den Absender
//
// Deployen:  supabase functions deploy kontakt --no-verify-jwt
// (Anleitung siehe SUPABASE-SETUP.md)
// ═══════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Konfiguration ──────────────────────────────────────────────────
const EMPFAENGER = ["m.manich@team-mt.de", "hrzina.a@rittal.at"];
const ABSENDER = "Smart Circle Austria <kontakt@smart-circle-austria.at>";

// Erlaubte Herkunft (CORS). "*" zulässt alle; für mehr Sicherheit auf die
// eigene Domain setzen, z. B. "https://www.smart-circle-austria.at".
const ALLOW_ORIGIN = "*";

const CORS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendEmail(payload: Record<string, unknown>) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  try {
    const body = await req.json();
    const name = (body.name || "").toString().trim();
    const company = (body.company || "").toString().trim();
    const role = (body.role || "").toString().trim();
    const email = (body.email || "").toString().trim();
    const message = (body.message || "").toString().trim();
    const honeypot = (body.website || "").toString().trim();

    // Spam-Schutz: Bots füllen das versteckte Feld "website" aus.
    if (honeypot) return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

    // Validierung
    if (!name || !email || !email.includes("@") || !message) {
      return new Response(JSON.stringify({ error: "Pflichtfelder fehlen." }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── 1) In Supabase speichern (service_role umgeht RLS) ──────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: dbError } = await supabase.from("kontaktanfragen").insert({
      name, company, role, email, message,
      user_agent: req.headers.get("user-agent") ?? null,
    });
    if (dbError) console.error("DB-Insert-Fehler:", dbError.message);

    // ── 2) Interne Weiterleitung an das Team ────────────────────────
    const internalHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0D0D0D">
        <div style="border-top:4px solid #ED2939;padding:20px 0 8px">
          <h2 style="margin:0 0 4px;font-size:18px">Neue Kontaktanfrage</h2>
          <p style="margin:0;color:#777;font-size:13px">über smart-circle-austria.at</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
          <tr><td style="padding:8px 0;color:#888;width:130px">Name</td><td style="padding:8px 0"><b>${esc(name)}</b></td></tr>
          <tr><td style="padding:8px 0;color:#888">Unternehmen</td><td style="padding:8px 0">${esc(company) || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#888">Funktion</td><td style="padding:8px 0">${esc(role) || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#888">E-Mail</td><td style="padding:8px 0"><a href="mailto:${esc(email)}" style="color:#ED2939">${esc(email)}</a></td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#F5F5F5;border-left:4px solid #ED2939;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(message)}</div>
        <p style="margin-top:16px;color:#aaa;font-size:12px">Direkt antworten möglich — die Reply-Adresse ist der Absender.</p>
      </div>`;

    await sendEmail({
      from: ABSENDER,
      to: EMPFAENGER,
      reply_to: email,
      subject: `Neue Kontaktanfrage: ${name}${company ? " (" + company + ")" : ""}`,
      html: internalHtml,
    });

    // ── 3) Eingangsbestätigung an den Absender ──────────────────────
    const replyHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0D0D0D">
        <div style="border-top:4px solid #ED2939;padding:20px 0 8px">
          <h2 style="margin:0;font-size:18px">Vielen Dank für Ihre Nachricht</h2>
        </div>
        <p style="font-size:14px;line-height:1.7">Hallo ${esc(name)},</p>
        <p style="font-size:14px;line-height:1.7">
          wir haben Ihre Anfrage erhalten und melden uns in Kürze bei Ihnen.
          Diese E-Mail ist eine automatische Eingangsbestätigung.
        </p>
        <div style="margin:16px 0;padding:16px;background:#F5F5F5;border-left:4px solid #ED2939;font-size:13px;line-height:1.6;white-space:pre-wrap;color:#555">${esc(message)}</div>
        <p style="font-size:14px;line-height:1.7">Mit freundlichen Grüßen<br><b>Smart Circle Austria</b></p>
        <p style="margin-top:20px;color:#aaa;font-size:12px">Bitte antworten Sie nicht direkt auf diese automatische Nachricht.</p>
      </div>`;

    await sendEmail({
      from: ABSENDER,
      to: [email],
      subject: "Ihre Anfrage bei Smart Circle Austria",
      html: replyHtml,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Fehler:", err);
    return new Response(JSON.stringify({ error: "Serverfehler" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
