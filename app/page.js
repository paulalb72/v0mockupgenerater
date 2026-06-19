const example = `POST /api/generate
Authorization: Bearer <INBOUND_WEBHOOK_SECRET>
Content-Type: application/json

{
  "jobId": "customer-website-123",
  "url": "https://example.com",
  "prompt": "Erstelle die Website neu und verwende aktuelle Inhalte.",
  "logo": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...",
  "brandManual": {},
  "websiteStructure": {},
  "additionalTexts": { "claim": "Qualitaet aus einer Hand" },
  "metadata": { "customerId": "123" }
}`;

export default function Home() {
  return (
    <main style={{ margin: '0 auto', maxWidth: 900, padding: '64px 24px' }}>
      <p style={{ color: '#666', fontWeight: 700, letterSpacing: 1 }}>
        WEBSITE AGENT
      </p>
      <h1 style={{ fontSize: 48, lineHeight: 1.05, marginBottom: 20 }}>
        Crawl, Kontext und v0 in einem Workflow.
      </h1>
      <p style={{ color: '#444', fontSize: 18, lineHeight: 1.6 }}>
        Der Dienst nimmt Website-Vorgaben per Webhook entgegen, crawlt die
        vorhandene Website und sendet nach Abschluss den v0-Demo-Link an den
        konfigurierten Completion-Webhook.
      </p>
      <pre
        style={{
          background: '#111',
          borderRadius: 12,
          color: '#eee',
          marginTop: 32,
          overflowX: 'auto',
          padding: 24,
          whiteSpace: 'pre-wrap',
        }}
      >
        {example}
      </pre>
    </main>
  );
}
