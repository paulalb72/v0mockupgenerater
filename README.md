# Website Agent

Ein Vercel-Dienst, der zwei bisher getrennte Aufgaben in einem dauerhaften
Workflow verbindet:

1. Eine bestehende Website crawlen und aktuelle Texte, Seitenstruktur und
   Bild-URLs extrahieren.
2. Diese Inhalte zusammen mit Brand Manual, Wireframes, Website-Struktur und
   einem individuellen Prompt an die v0 Platform API senden.
3. Nach Abschluss den Demo-Link an einen Completion-Webhook senden.

## API

### `POST /api/generate`

Authentifizierung:

```http
Authorization: Bearer <INBOUND_WEBHOOK_SECRET>
```

Alternativ wird `x-webhook-secret` akzeptiert.

Beispiel:

```json
{
  "jobId": "customer-website-123",
  "url": "https://example.com",
  "prompt": "Erstelle eine moderne Website. Beachte die Vorgaben und uebernimm aktuelle Inhalte aus dem Crawl.",
  "logo": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...",
  "brandManual": {
    "colors": {
      "primary": "#111111"
    }
  },
  "websiteStructure": {
    "pages": ["home", "services", "contact"],
    "home": ["header", "hero", "services", "footer"]
  },
  "additionalTexts": {
    "claim": "Qualitaet aus einer Hand",
    "ueber-uns": "Wir sind seit 1998 ..."
  },
  "metadata": {
    "customerId": "123"
  },
  "maxPages": 15
}
```

### Felder

- `prompt` (Pflicht): Auftragstext, max. 50.000 Zeichen.
- `url` (Pflicht): oeffentliche http/https-URL der Bestandswebsite. Aliase: `currentUrl`, `websiteUrl`.
- `logo` (Pflicht): Marken-Logo als base64 Data-URL (`data:image/...;base64,...`). Es wird in den Vercel Blob Store hochgeladen und als erstes v0-Attachment verwendet; v0 baut es als offizielles Logo ein.
- `brandManual` (optional): reines JSON (Text), kein Logo, kein PDF. Alias: `brand_manual`.
- `websiteStructure` (optional): reines JSON (Text), enthaelt auch die Wireframe-Infos. Alias: `structure`.
- `additionalTexts` (optional): Map `Label -> Text` fuer beliebig viele Zusatztexte.
- `metadata` (optional): wird unveraendert im Completion-Webhook zurueckgegeben.
- `maxPages` (optional): Crawl-Limit 1-30 (Default 15).

Das frühere Feld `wireframes` entfaellt; Wireframe-Infos gehoeren in `websiteStructure`.

Die Antwort erfolgt sofort:

```json
{
  "success": true,
  "accepted": true,
  "jobId": "customer-website-123",
  "runId": "wrun_...",
  "status": "queued"
}
```

## Completion-Webhook

Standardziel:

```text
https://mmpagent.makemyki.de/api/webhooks/website-agent
```

Erfolgspayload:

```json
{
  "success": true,
  "status": "completed",
  "jobId": "customer-website-123",
  "sourceUrl": "https://example.com/",
  "chatId": "chat_...",
  "versionId": "ver_...",
  "demoUrl": "https://...",
  "screenshotUrl": "https://...",
  "webUrl": "https://v0.app/chat/...",
  "crawledPages": 12,
  "crawlTruncated": false,
  "metadata": {
    "customerId": "123"
  },
  "completedAt": "2026-06-14T12:00:00.000Z"
}
```

Bei einem Fehler wird dasselbe Ziel mit `success: false`, `status: "failed"`
und einem `error`-Objekt aufgerufen.

Wenn `COMPLETION_WEBHOOK_SECRET` gesetzt ist, enthaelt der Callback
`x-website-agent-signature`. Der Wert ist ein HMAC-SHA256 ueber den exakten
JSON-Body im Format `sha256=<hex>`.

## Vercel Deployment

1. Diesen Ordner als Vercel-Projekt importieren.
2. Einen Blob Store anlegen (Storage -> Blob) und mit dem Projekt verbinden. Das
   stellt `BLOB_READ_WRITE_TOKEN` bereit, ueber das das Logo gespeichert wird.
3. Die uebrigen Variablen aus `.env.example` setzen.
4. Node.js 22.17 oder neuer verwenden.
5. Deployment ausloesen.

`CHROMIUM_PACK_URL` ist fuer den Browser-Crawl auf Vercel erforderlich. Die
Major-Version im URL-Pfad muss zur installierten
`@sparticuz/chromium-min`-Version passen. Das Beispiel verwendet das
Vercel-uebliche x64-Pack.

Vercel Workflow uebernimmt Queueing, Retries, Schlafphasen beim v0-Polling und
Observability. Ein offener HTTP-Request muss dadurch nicht mehrere Minuten
leben.

## Lokal

Ein lokal installiertes Chrome oder Chromium kann ohne Remote-Pack verwendet
werden:

```dotenv
CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

Danach:

```bash
npm install
npm test
npm run dev
```

## Grenzen

- Der Crawler bleibt auf demselben Origin und crawlt standardmaessig maximal
  15 HTML-Seiten.
- Text- und Promptgroessen werden begrenzt, damit v0 nicht mit unkontrolliert
  grossen Websites ueberladen wird.
- Private, lokale und interne Ziele werden zum Schutz vor SSRF blockiert.
- Externe Shops, Logins, geschuetzte Bereiche und Inhalte hinter komplexen
  Consent-Flows koennen unvollstaendig sein.
- Die Nutzung gecrawlter Texte und Bilder setzt voraus, dass die dafuer
  erforderlichen Rechte vorliegen.
