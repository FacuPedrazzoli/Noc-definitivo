import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'module';

// pdf-parse is CommonJS — use createRequire for ESM compatibility
const require = createRequire(import.meta.url);

const ROOT       = process.cwd();
const PDF_PATH   = path.join(ROOT, 'public', 'content', 'master-document.pdf');
const OUT_DIR    = path.join(ROOT, 'src', 'content');
const OUT_FILE   = path.join(OUT_DIR, 'sections.json');
const PUB_DIR    = path.join(ROOT, 'public');
const SRCH_FILE  = path.join(PUB_DIR, 'search-index.json');

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

function excerpt(html, n = 220) {
  const t = stripTags(html);
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t;
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Heading detection (text-based heuristics) ──────────────────────────────
// Returns 2 (H2 / main section), 3 (H3 / subsection), 0 (body)

function headingLevel(line, prevBlank) {
  const t = line.trim();
  if (!t || t.length < 2 || t.length > 160) return 0;

  // Definite numbered subsection: "1.1", "2.3", "1.1.1"
  if (/^\d+\.\d+(\.\d+)?\.?\s+\S/.test(t) && t.length < 120) return 3;

  // Definite numbered main section: "1.", "2.", … "20."
  if (/^\d{1,2}\.\s+\S/.test(t) && t.length < 120) return 2;

  // Chapter / module keywords
  if (/^(CAP[ÍI]TULO|M[ÓO]DULO|PARTE|UNIDAD|SECCI[ÓO]N|ANEXO)\b/i.test(t)) return 2;

  // Heuristic: short standalone line after blank, no trailing punctuation
  if (prevBlank && t.length < 90 && !/[.,:;?!)\]"'»]$/.test(t) && /^[A-ZÁÉÍÓÚÑÜ]/.test(t)) {
    const allCaps = !/[a-záéíóúñü]/.test(t) && /[A-ZÁÉÍÓÚÑÜ]{3,}/.test(t);
    if (allCaps) return 2;
    if (t.length < 65) return 3;
  }

  return 0;
}

function cleanHeading(raw) {
  return raw
    .replace(/^\d+\.\d+(\.\d+)?\.?\s*/,'')
    .replace(/^\d{1,2}\.\s*/,'')
    .replace(/^(CAP[ÍI]TULO|M[ÓO]DULO|PARTE|UNIDAD|SECCI[ÓO]N|ANEXO)\s*\d*\s*[:\-–]?\s*/i,'')
    .trim();
}

// ── Lines → HTML converter ─────────────────────────────────────────────────

function linesToHtml(lines) {
  const out = [];
  let list = null;
  let para = [];

  const flushPara = () => {
    const t = para.join(' ').trim();
    if (t) out.push(`<p>${esc(t)}</p>`);
    para = [];
  };
  const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const rawLine of lines) {
    const t = rawLine.trim();
    if (!t) { flushPara(); flushList(); continue; }

    // Unordered bullet
    const ul = t.match(/^[\u2022\u2023\u25e6\u2714\u25cf•*\-]\s+(.+)/);
    if (ul) {
      flushPara();
      if (list !== 'ul') { flushList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${esc(ul[1])}</li>`);
      continue;
    }

    // Ordered list item (not a section heading)
    const ol = t.match(/^(\d{1,2})[.)]\s+(.+)/);
    if (ol && !/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑÜ\w]/.test(t)) {
      flushPara();
      if (list !== 'ol') { flushList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${esc(ol[2])}</li>`);
      continue;
    }

    flushList();

    // Callout
    const cw = t.match(/^(IMPORTANTE|NOTA|TIP|WARNING|ATENCI[ÓO]N|RECUERDA)[:\s]/i);
    if (cw) {
      flushPara();
      const k = cw[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      const cls = {importante:'callout-important',nota:'callout-note',tip:'callout-tip',
                   warning:'callout-warning',atencion:'callout-warning',recuerda:'callout-note'}[k]||'callout-note';
      out.push(`<div class="callout ${cls}"><strong>${esc(t)}</strong></div>`);
      continue;
    }

    para.push(t);
    if (/[.!?:;\u201d"'\]>»]$/.test(t)) flushPara();
  }

  flushPara(); flushList();
  return out.join('\n');
}

// ── Main section parser ────────────────────────────────────────────────────

function parseIntoSections(rawText) {
  const allLines = rawText.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');

  // Remove lone page numbers
  const lines = allLines.filter(l => {
    const t = l.trim();
    return t === '' || !(t.length <= 4 && /^\d+$/.test(t));
  });

  // Annotate every line with heading level
  const annotated = lines.map((l, i) => ({
    text: l.trim(),
    level: headingLevel(l, i === 0 || lines[i-1].trim() === ''),
  }));

  const h2s = annotated.filter(a => a.level === 2);

  // Fallback: one big section
  if (h2s.length === 0) {
    console.warn('[prebuild] No H2 headings found — single section fallback');
    const content = linesToHtml(annotated.map(a => a.text));
    return [{ id:'contenido', slug:'contenido', title:'Contenido',
              excerpt: excerpt(content), content, subsections:[], order:0 }];
  }

  const seen = new Map();

  return h2s.map((h2, sIdx) => {
    const h2i = annotated.indexOf(h2);
    const end = h2s[sIdx+1] ? annotated.indexOf(h2s[sIdx+1]) : annotated.length;
    const body = annotated.slice(h2i+1, end);

    const h3s = body.filter(a => a.level === 3);
    const htmlParts = [];
    const subsections = [];

    if (h3s.length === 0) {
      htmlParts.push(linesToHtml(body.map(a => a.text)));
    } else {
      const first3 = body.indexOf(h3s[0]);
      if (first3 > 0) htmlParts.push(linesToHtml(body.slice(0, first3).map(a => a.text)));

      h3s.forEach((h3, h3i) => {
        const h3pos = body.indexOf(h3);
        const h3end = h3s[h3i+1] ? body.indexOf(h3s[h3i+1]) : body.length;
        const subTitle = cleanHeading(h3.text);
        const subId = slugify(subTitle);
        htmlParts.push(`<h3 id="${subId}">${esc(subTitle)}</h3>`);
        htmlParts.push(linesToHtml(body.slice(h3pos+1, h3end).map(a => a.text)));
        if (subTitle) subsections.push({ id: subId, title: subTitle });
      });
    }

    const title = cleanHeading(h2.text);
    let base = slugify(title) || `seccion-${sIdx}`;
    let slug = base; let c = 1;
    while (seen.has(slug)) slug = `${base}-${c++}`;
    seen.set(slug, true);

    const content = `<h2 id="${slug}">${esc(title)}</h2>\n${htmlParts.join('\n')}`;
    return { id:slug, slug, title, excerpt:excerpt(content), content, subsections, order:sIdx };
  }).filter(s => s.title && stripTags(s.content).length > 40);
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  await fs.access(PDF_PATH).catch(() => {
    throw new Error(`PDF not found: ${PDF_PATH}\nPlace master-document.pdf in public/content/`);
  });

  console.log(`[prebuild] Reading ${PDF_PATH}…`);
  const pdfBuffer = await fs.readFile(PDF_PATH);

  // pdf-parse wraps pdfjs-dist and handles all Node.js compatibility
  const pdfParse = require('pdf-parse');
  const pdfData  = await pdfParse(pdfBuffer);
  console.log(`[prebuild] ${pdfData.numpages} pages, ${pdfData.text.length.toLocaleString()} chars extracted`);

  const sections = parseIntoSections(pdfData.text);

  console.log(`[prebuild] ${sections.length} sections:`);
  sections.forEach((s, i) =>
    console.log(`  ${String(i+1).padStart(2,'0')}. [${s.slug}] ${s.title} (${s.subsections.length} sub)`)
  );

  const docData = {
    title: 'La Guía Definitiva del NOC',
    description: 'Manual completo para convertirse en NOC Analyst: fundamentos, networking, observabilidad, incident management, herramientas y roadmap profesional.',
    lastUpdated: new Date().toISOString(),
    totalSections: sections.length,
    sections,
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(docData, null, 2), 'utf-8');
  console.log(`[prebuild] ✓ sections.json → ${OUT_FILE}`);

  await fs.mkdir(PUB_DIR, { recursive: true });
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
    title: 'La Guía Definitiva del NOC', description: '',
    lastUpdated: new Date().toISOString(), totalSections: 1,
    sections: [{
      id:'error', slug:'error', title:'Error al procesar el documento',
      excerpt: err.message,
      content: `<div class="callout callout-warning"><strong>Error:</strong> No se pudo procesar <code>master-document.pdf</code>.<br/><pre>${esc(err.message)}</pre></div>`,
      subsections:[], order:0,
    }],
  };
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
  console.log('[prebuild] Fallback written.');
});
