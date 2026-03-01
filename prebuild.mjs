import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const ROOT      = process.cwd();
const MD_FILE   = path.join(ROOT, 'Guia_Maestra_NOC_a_SRE_Pagos_Globales.md');
const OUT_DIR   = path.join(ROOT, 'src', 'content');
const OUT_FILE  = path.join(OUT_DIR, 'sections.json');
const PUB_DIR   = path.join(ROOT, 'public');
const SRCH_FILE = path.join(PUB_DIR, 'search-index.json');

// ── Utilities ──────────────────────────────────────────────────────────────

function slugify(str) {
  return (str || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'seccion';
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
    .replace(/\s+/g,' ').trim();
}

function makeExcerpt(html, n = 220) {
  const t = stripTags(html);
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t;
}

// ── HTML post-processing ────────────────────────────────────────────────────

function enhanceHtml(html) {
  // Wrap tables for responsive horizontal scroll
  html = html.replace(/<table/g, '<div class="table-wrapper"><table')
             .replace(/<\/table>/g, '</table></div>');

  // Convert blockquote+strong callout patterns to styled callout divs
  // Matches: <p><strong>KEYWORD:</strong> text</p>
  html = html.replace(
    /<p>\s*(?:💡|⚠️|ℹ️|✅|🔥|🚨)?\s*<strong>(Importante|Nota|Tip|Warning|Atenci[oó]n|Recuerda)[:\s]*(.*?)<\/strong>(.*?)<\/p>/gi,
    (_, kind, boldRest, rest) => {
      const k = kind.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cls = { importante:'callout-important', nota:'callout-note', tip:'callout-tip',
                    warning:'callout-warning', atencion:'callout-warning', recuerda:'callout-note' }[k] || 'callout-note';
      return `<div class="callout ${cls}"><strong>${kind}:</strong> ${boldRest}${rest}</div>`;
    }
  );

  return html;
}

// ── Strip numbering prefix from heading text ("1. Intro" → "Intro") ─────────

function cleanTitle(raw) {
  return raw
    .replace(/^\d+\.\d+(\.\d+)?\s+/, '')
    .replace(/^\d{1,2}\.\s+/, '')
    .trim();
}

// ── Parse marked-generated HTML into sections ──────────────────────────────

function parseHtmlIntoSections(html) {
  // Split on every <h2 …> tag — these are the ## headings from the MD
  const parts = html.split(/(?=<h2[\s>])/i).filter(p => p.trim());

  if (parts.length === 0) {
    return [{ id:'contenido', slug:'contenido', title:'Contenido',
              excerpt: makeExcerpt(html), content: html, subsections:[], order:0 }];
  }

  const seen = new Map();
  const sections = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const h2Match = part.match(/<h2[^>]*>(.*?)<\/h2>/i);
    if (!h2Match) continue;

    const rawTitle = stripTags(h2Match[1]).trim();
    const title    = cleanTitle(rawTitle);
    if (!title) continue;

    let base = slugify(title) || `seccion-${i}`;
    let slug = base; let c = 1;
    while (seen.has(slug)) slug = `${base}-${c++}`;
    seen.set(slug, true);

    // Extract h3 subsections within this part
    const h3Re = /<h3[^>]*>(.*?)<\/h3>/gi;
    const subsections = [];
    let m;
    while ((m = h3Re.exec(part)) !== null) {
      const subTitle = cleanTitle(stripTags(m[1]).trim());
      if (subTitle) subsections.push({ id: slugify(subTitle), title: subTitle });
    }

    sections.push({
      id: slug, slug, title,
      excerpt: makeExcerpt(part),
      content: part,
      subsections,
      order: i,
    });
  }

  return sections.filter(s => stripTags(s.content).length > 40);
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PUB_DIR, { recursive: true });

  await fs.access(MD_FILE).catch(() => {
    throw new Error(`Markdown file not found: ${MD_FILE}`);
  });

  console.log(`[prebuild] Reading ${MD_FILE}…`);
  const mdText = await fs.readFile(MD_FILE, 'utf-8');
  console.log(`[prebuild] ${mdText.length.toLocaleString()} chars of Markdown`);

  // marked.parse() with GFM (tables, code fences, etc.)
  const rawHtml = marked.parse(mdText, { gfm: true, breaks: false });
  const html    = enhanceHtml(rawHtml);

  const sections = parseHtmlIntoSections(html);

  console.log(`[prebuild] ${sections.length} sections:`);
  sections.forEach((s, i) =>
    console.log(`  ${String(i+1).padStart(2,'0')}. [${s.slug}] ${s.title} (${s.subsections.length} sub)`)
  );

  const docData = {
    title: 'La Guía Maestra del NOC a SRE en Sistemas de Pagos Globales',
    description: 'Handbook técnico corporativo para NOC Operators, SRE Engineers y Payments Engineers.',
    lastUpdated: new Date().toISOString(),
    totalSections: sections.length,
    sections,
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(docData, null, 2), 'utf-8');
  console.log(`[prebuild] ✓ sections.json → ${OUT_FILE}`);

  const searchIndex = sections.map((s, i) => ({
    id: i, slug: s.slug, title: s.title,
    text: stripTags(s.content).replace(/\s+/g,' ').trim(),
  }));
  await fs.writeFile(SRCH_FILE, JSON.stringify(searchIndex), 'utf-8');
  console.log(`[prebuild] ✓ search-index.json → ${SRCH_FILE}`);
}

await main().catch(async err => {
  console.error('[prebuild] FATAL:', err.message);
  const fallback = {
    title: 'La Guía Maestra del NOC a SRE en Sistemas de Pagos Globales',
    description: '',
    lastUpdated: new Date().toISOString(),
    totalSections: 1,
    sections: [{
      id:'error', slug:'error', title:'Error al procesar el documento',
      excerpt: err.message,
      content: `<div class="callout callout-warning"><strong>Error:</strong> ${err.message}</div>`,
      subsections:[], order:0,
    }],
  };
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
  console.log('[prebuild] Fallback written.');
});
