import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const PDF_FILE = 'NOC-ABSOLUTO.pdf';
const OUTPUT_DIR = path.join(ROOT, 'src', 'content');
const OUTPUT = path.join(OUTPUT_DIR, 'sections.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SEARCH_OUTPUT = path.join(PUBLIC_DIR, 'search-index.json');

// ── Utilities ──────────────────────────────────────────────────────────────

function slugify(str) {
  return (str || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'seccion';
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

function extractExcerpt(html, maxLen = 220) {
  const text = stripTags(html);
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Heading detection heuristics ───────────────────────────────────────────
// Returns 2 (H2), 3 (H3), or 0 (not a heading)

function getHeadingLevel(line, prevWasEmpty) {
  const t = line.trim();
  if (!t || t.length < 2 || t.length > 160) return 0;

  // Numbered sub-sections: "1.1", "1.1.", "2.3 Title", "1.1.1 Title"
  if (/^\d+\.\d+(\.\d+)?\.?\s+\S/.test(t) && t.length < 120) return 3;

  // Numbered main sections: "1.", "2.", "10." followed by uppercase word
  if (/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑÜ\w]/.test(t) && t.length < 120) return 2;

  // Chapter / module keywords
  if (/^(CAP[IÍ]TULO|MÓDULO|MODULO|PARTE|UNIDAD|SECCIÓN|SECCION|ANEXO)\s*\d*/i.test(t)) return 2;

  // Heuristic: short standalone line after blank line, no trailing punctuation
  if (prevWasEmpty && t.length < 90 && !/[.,:;?!)\]"'»]$/.test(t) && /^[A-ZÁÉÍÓÚÑÜ]/.test(t)) {
    const isAllCaps = !/[a-záéíóúñü]/.test(t) && /[A-ZÁÉÍÓÚÑÜ]{3,}/.test(t);
    if (isAllCaps && t.length > 3) return 2;
    if (t.length < 65) return 3;
  }

  return 0;
}

function cleanTitle(raw) {
  return raw
    .replace(/^\d+\.\d+(\.\d+)?\.?\s*/, '')   // strip sub-numbering
    .replace(/^\d{1,2}\.\s*/, '')              // strip main numbering
    .replace(/^(CAP[IÍ]TULO|MÓDULO|MODULO|PARTE|UNIDAD|SECCIÓN|SECCION|ANEXO)\s*\d*\s*[:\-–]?\s*/i, '')
    .trim();
}

// ── Lines → HTML converter ─────────────────────────────────────────────────

function linesToHtml(lines) {
  const out = [];
  let listType = null;
  let para = [];

  function flushPara() {
    const text = para.join(' ').trim();
    if (text) out.push(`<p>${escHtml(text)}</p>`);
    para = [];
  }
  function flushList() {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  }

  for (const rawLine of lines) {
    const t = rawLine.trim();

    if (!t) { flushPara(); flushList(); continue; }

    // Unordered bullet
    const ulMatch = t.match(/^[\u2022\u2023\u25e6\u2043\u2219\u2714\u25cf•*\-]\s+(.+)/);
    if (ulMatch) {
      flushPara();
      if (listType !== 'ul') { flushList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${escHtml(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list item ("1) item" or "1. item") — only when NOT a heading pattern
    const olMatch = t.match(/^(\d{1,2})[.)]\s+(.+)/);
    if (olMatch && !/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑÜ]/.test(t)) {
      flushPara();
      if (listType !== 'ol') { flushList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${escHtml(olMatch[2])}</li>`);
      continue;
    }

    flushList();

    // Detect callout keywords in standalone lines
    const calloutMatch = t.match(/^(IMPORTANTE|NOTA|TIP|WARNING|ATENCIÓN|ATENCION|RECUERDA)[:\s]/i);
    if (calloutMatch) {
      flushPara();
      const kw = calloutMatch[1].toLowerCase();
      const clsMap = { importante: 'callout-important', nota: 'callout-note', tip: 'callout-tip',
                       warning: 'callout-warning', atención: 'callout-warning', atencion: 'callout-warning',
                       recuerda: 'callout-note' };
      const cls = clsMap[kw] || 'callout-note';
      out.push(`<div class="callout ${cls}"><strong>${escHtml(t)}</strong></div>`);
      continue;
    }

    // Regular text — accumulate into paragraph
    para.push(t);
    // Flush paragraph at sentence-ending punctuation
    if (/[.!?:;\u201d"')\]>»]$/.test(t)) flushPara();
  }

  flushPara();
  flushList();
  return out.join('\n');
}

// ── Main section parser ────────────────────────────────────────────────────

function parseTextIntoSections(rawText) {
  const allLines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Remove lone page numbers and very short noise
  const lines = allLines.filter((l) => {
    const t = l.trim();
    if (!t) return true;
    if (/^\d{1,4}$/.test(t)) return false; // page numbers
    if (t.length < 2) return false;
    return true;
  });

  // Collect all heading positions
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const prevEmpty = i === 0 || !lines[i - 1].trim();
    const level = getHeadingLevel(lines[i], prevEmpty);
    if (level >= 2) headings.push({ idx: i, text: lines[i].trim(), level });
  }

  const h2List = headings.filter(h => h.level === 2);

  if (h2List.length === 0) {
    console.warn('[prebuild] No H2 headings detected — creating single section');
    const content = linesToHtml(lines);
    return [{ id: 'contenido', slug: 'contenido', title: 'Contenido',
              excerpt: extractExcerpt(content), content, subsections: [], order: 0 }];
  }

  const seen = new Map();
  const sections = h2List.map((h2, sIdx) => {
    const endIdx = sIdx < h2List.length - 1 ? h2List[sIdx + 1].idx : lines.length;
    const sectionLines = lines.slice(h2.idx + 1, endIdx);

    // H3 headings inside this section
    const subHeadings = headings.filter(h => h.level >= 3 && h.idx > h2.idx && h.idx < endIdx);

    const htmlParts = [];
    const subsections = [];

    if (subHeadings.length === 0) {
      htmlParts.push(linesToHtml(sectionLines));
    } else {
      // Content before first subheading
      const firstRel = subHeadings[0].idx - h2.idx - 1;
      if (firstRel > 0) htmlParts.push(linesToHtml(sectionLines.slice(0, firstRel)));

      subHeadings.forEach((sub, subIdx) => {
        const subRelStart = sub.idx - h2.idx - 1;
        const subEnd = subIdx < subHeadings.length - 1
          ? subHeadings[subIdx + 1].idx - h2.idx - 1
          : sectionLines.length;
        const subLines = sectionLines.slice(subRelStart + 1, subEnd);
        const subTitle = cleanTitle(sub.text);
        const subId = slugify(subTitle);
        htmlParts.push(`<h3 id="${subId}">${escHtml(subTitle)}</h3>`);
        htmlParts.push(linesToHtml(subLines));
        if (subTitle) subsections.push({ id: subId, title: subTitle });
      });
    }

    const title = cleanTitle(h2.text);
    let baseSlug = slugify(title) || `seccion-${sIdx}`;
    let slug = baseSlug;
    let c = 1;
    while (seen.has(slug)) slug = `${baseSlug}-${c++}`;
    seen.set(slug, true);

    const content = `<h2 id="${slug}">${escHtml(title)}</h2>\n${htmlParts.join('\n')}`;
    return { id: slug, slug, title, excerpt: extractExcerpt(content), content, subsections, order: sIdx };
  });

  return sections.filter(s => s.title && stripTags(s.content).length > 40);
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const pdfPath = path.join(ROOT, PDF_FILE);
  await fs.access(pdfPath).catch(() => {
    throw new Error(`PDF not found: ${PDF_FILE} — place it at the repo root.`);
  });

  console.log(`[prebuild] Reading ${PDF_FILE}…`);
  const pdfBuffer = await fs.readFile(pdfPath);

  const pdfParse = require('pdf-parse');
  const pdfData = await pdfParse(pdfBuffer);
  console.log(`[prebuild] ${pdfData.numpages} pages, ${pdfData.text.length.toLocaleString()} chars`);

  const sections = parseTextIntoSections(pdfData.text);

  console.log(`[prebuild] ${sections.length} sections:`);
  sections.forEach((s, i) =>
    console.log(`  ${String(i + 1).padStart(2, '0')}. [${s.slug}] ${s.title} (${s.subsections.length} sub)`)
  );

  const docData = {
    title: 'La Guía Definitiva del NOC',
    description:
      'Manual completo para convertirse en NOC Analyst: fundamentos, networking, observabilidad, incident management, herramientas y roadmap profesional.',
    lastUpdated: new Date().toISOString(),
    totalSections: sections.length,
    sections,
  };

  await fs.writeFile(OUTPUT, JSON.stringify(docData, null, 2), 'utf-8');
  console.log(`[prebuild] ✓ sections.json → ${OUTPUT}`);

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const searchIndex = sections.map((s, i) => ({
    id: i,
    slug: s.slug,
    title: s.title,
    text: stripTags(s.content).replace(/\s+/g, ' ').trim(),
  }));
  await fs.writeFile(SEARCH_OUTPUT, JSON.stringify(searchIndex), 'utf-8');
  console.log(`[prebuild] ✓ search-index.json → ${SEARCH_OUTPUT}`);
}

await main().catch(async (err) => {
  console.error('[prebuild] FATAL:', err.message);
  const fallback = {
    title: 'La Guía Definitiva del NOC',
    description: '',
    lastUpdated: new Date().toISOString(),
    totalSections: 1,
    sections: [{
      id: 'error', slug: 'error',
      title: 'Error al procesar el documento',
      excerpt: err.message,
      content: `<div class="callout callout-warning"><strong>Error:</strong> No se pudo procesar <code>${PDF_FILE}</code>.<br/><pre>${escHtml(err.message)}</pre></div>`,
      subsections: [],
      order: 0,
    }],
  };
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(fallback, null, 2), 'utf-8');
  console.log('[prebuild] Fallback content written.');
});
