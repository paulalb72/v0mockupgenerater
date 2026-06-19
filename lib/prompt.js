const MAX_JSON_CHARS = 45_000;
const MAX_FINAL_PROMPT_CHARS = 150_000;

export function buildV0Prompt(input, crawl) {
  const sections = [
    `# Auftrag\n${input.prompt.trim()}`,
    `# Verbindliche Arbeitsweise
- Erstelle eine vollständige, responsive Website, nicht nur ein isoliertes Mockup.
- Brand Manual und Website-Struktur haben Vorrang vor dem Design der gecrawlten Bestandsseite.
- Das erste angehängte Bild ist das offizielle Marken-Logo. Verwende genau dieses Logo prominent im Header und im Footer und ersetze damit jedes Logo aus dem Crawl.
- Übernimm aus dem Crawl aktuelle, sachlich passende Texte, Leistungen, Kontaktinformationen und Bildmotive.
- Erfinde keine Unternehmensfakten, Zertifikate, Referenzen, Preise oder Kontaktdaten.
- Widersprechen sich Crawl und übergebene JSON-Vorgaben, gelten die JSON-Vorgaben.
- Verwende semantisches HTML, barrierearme Komponenten und eine klare mobile Navigation.
- Verwende die unten aufgeführten Bild-URLs nur, wenn sie inhaltlich und rechtlich zur Bestandswebsite gehören.
- Liefere eine direkt lauffähige Website mit allen benötigten Seiten und Komponenten.`,
    formatJsonSection('Brand Manual', input.brandManual),
    formatJsonSection('Website-Struktur', input.websiteStructure),
    formatTextsSection('Weitere Texte', input.additionalTexts),
    formatJsonSection('Aktueller Website-Crawl', crawl),
  ].filter(Boolean);

  const prompt = sections.join('\n\n');

  if (prompt.length <= MAX_FINAL_PROMPT_CHARS) {
    return prompt;
  }

  return `${prompt.slice(0, MAX_FINAL_PROMPT_CHARS)}

[Kontext wurde wegen der maximalen Promptgroesse gekuerzt.]`;
}

export function getV0ImageAttachments(crawl) {
  const prioritized = [...(crawl.images || [])].sort((left, right) => {
    const leftLogo = /logo|brand/i.test(`${left.alt || ''} ${left.url}`);
    const rightLogo = /logo|brand/i.test(`${right.alt || ''} ${right.url}`);

    return Number(rightLogo) - Number(leftLogo);
  });

  return prioritized
    .filter((image) => typeof image.url === 'string' && /^https?:/i.test(image.url))
    .slice(0, 8)
    .map((image) => ({ url: image.url }));
}

function formatTextsSection(title, texts) {
  if (!texts || typeof texts !== 'object') {
    return '';
  }

  const entries = Object.entries(texts).filter(
    ([, value]) => typeof value === 'string' && value.trim() !== '',
  );

  if (entries.length === 0) {
    return '';
  }

  const body = entries
    .map(([label, value]) => `## ${label}\n${value.trim()}`)
    .join('\n\n');
  const content = body.length > MAX_JSON_CHARS
    ? `${body.slice(0, MAX_JSON_CHARS)}\n[Texte gekuerzt]`
    : body;

  return `# ${title}\n${content}`;
}

function formatJsonSection(title, value) {
  if (value === null || value === undefined) {
    return '';
  }

  const serialized = JSON.stringify(value, null, 2);
  const content = serialized.length > MAX_JSON_CHARS
    ? `${serialized.slice(0, MAX_JSON_CHARS)}\n[JSON gekuerzt]`
    : serialized;

  return `# ${title}\n\`\`\`json\n${content}\n\`\`\``;
}
