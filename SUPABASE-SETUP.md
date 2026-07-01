# Kontaktformular → Supabase + E-Mail (Resend)

So verbindest du das Formular. Drei Bausteine: **Supabase** (speichert Anfragen),
**Resend** (versendet E-Mails), und die **Edge Function** (verbindet beides).

---

## 1. Supabase-Projekt anlegen
1. Auf https://supabase.com registrieren → **New project** (Region: Frankfurt/EU wählen).
2. Warten, bis das Projekt bereit ist.
3. Tabelle anlegen: **SQL Editor → New query** → Inhalt von `supabase/schema.sql`
   einfügen → **Run**.

## 2. Schlüssel ins Frontend eintragen
In Supabase: **Project Settings → API**. Dort findest du:
- **Project URL** → in `index.html` bei `SUPABASE_URL` eintragen
- **anon / public** Key → in `index.html` bei `SUPABASE_ANON_KEY` eintragen

> ⚠️ NUR den **anon/public**-Key verwenden — niemals den `service_role`-Key ins Frontend!

## 3. Resend einrichten (E-Mail-Versand)
1. Auf https://resend.com registrieren.
2. **Domains → Add Domain** → `smart-circle-austria.at` hinzufügen.
3. Die angezeigten **DNS-Einträge** (SPF, DKIM) bei deinem Domain-Anbieter
   eintragen und auf „Verified" warten. (Ohne verifizierte Domain landen Mails
   im Spam oder werden abgelehnt.)
4. **API Keys → Create API Key** → den Key kopieren (beginnt mit `re_…`).

## 4. Edge Function deployen
Du brauchst die **Supabase CLI** (https://supabase.com/docs/guides/cli).

```bash
# einmalig: einloggen und Projekt verknüpfen
supabase login
supabase link --project-ref DEIN-PROJEKT-REF   # die Ref steht in der Project URL

# Resend-Key als Secret hinterlegen (NICHT im Code!)
supabase secrets set RESEND_API_KEY=re_dein_key_hier

# Function deployen (--no-verify-jwt erlaubt öffentliche Aufrufe vom Formular)
supabase functions deploy kontakt --no-verify-jwt
```

Die Datei `supabase/functions/kontakt/index.ts` ist bereits fertig — du musst sie
nur deployen. `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase der
Function automatisch bereit.

## 5. Testen
- Live-Seite öffnen → Formular ausfüllen → absenden.
- Erwartung: „Anfrage gesendet" erscheint, beide Empfänger bekommen die Mail,
  der Absender erhält die Eingangsbestätigung.
- Kontrolle der gespeicherten Anfragen: Supabase → **Table Editor → kontaktanfragen**.

---

## Wo wird was eingetragen? (Kurzüberblick)
| Wert | Wohin |
|------|-------|
| Project URL | `index.html` → `SUPABASE_URL` |
| anon public key | `index.html` → `SUPABASE_ANON_KEY` |
| Resend API Key | Supabase Secret `RESEND_API_KEY` (per CLI) |
| Empfänger-Adressen | bereits in `index.ts` hinterlegt |
| Absenderadresse | `kontakt@smart-circle-austria.at` (in `index.ts`) |

## Fehlersuche
- **Mails kommen nicht an:** In Resend die Domain wirklich „Verified"? Logs unter
  Supabase → **Edge Functions → kontakt → Logs** prüfen.
- **Formular meldet Fehler:** Sind `SUPABASE_URL`/`SUPABASE_ANON_KEY` in `index.html`
  korrekt? Wurde die Function mit `--no-verify-jwt` deployed?
- **CORS-Fehler:** In `index.ts` `ALLOW_ORIGIN` ggf. auf die eigene Domain setzen.
