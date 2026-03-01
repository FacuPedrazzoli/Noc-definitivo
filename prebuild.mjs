import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const PDF_PATH = path.join(ROOT, 'public', 'content', 'master-document.pdf');
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

// ── PDF text extraction via pdfjs-dist ────────────────────────────────────
// Each item: { str, height, x, y, page }

async function extractPdfItems(pdfBuffer) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  // Disable worker in Node.js build-time context
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;

  const uint8 = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  console.log(`[prebuild] pdfjs loaded ${pdf.numPages} pages`);

  const allItems = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent({ normalizeWhitespace: true });
    for (const item of content.items) {
      const str = item.str;
      if (!str || !str.trim()) continue;
      // height from transform matrix: | a b | → scaleY = transform[3]
      const height = item.height > 0 ? item.height : Math.abs(item.transform[3]);
      allItems.push({
        str: str,
        height: Math.round(height * 100) / 100,
        x: item.transform[4],
        y: item.transform[5],
        page: p,
      });
    }
  }
  return allItems;
}

// ── Group items into logical lines (same page + similar Y) ─────────────────

function groupIntoLines(items) {
  if (!items.length) return [];
  const lines = [];
  let cur = [items[0]];
  const Y_TOL = 1.5;

  for (let i = 1; i < items.length; i++) {
    const prev = cur[cur.length - 1];
    const item = items[i];
    if (item.page === prev.page && Math.abs(item.y - prev.y) <= Y_TOL) {
      cur.push(item);
    } else {
      lines.push(cur);
      cur = [item];
    }
  }
  lines.push(cur);
  return lines;
}

// ── Determine heading level from font-size distribution ────────────────────

function buildFontSizeMap(lines) {
  const freq = {};
  for (const line of lines) {
    const h = Math.round(Math.max(...line.map(i => i.height)) * 2) / 2;
    if (h > 0) freq[h] = (freq[h] || 0) + line.length;
  }
  // Modal size = body text (most frequent)
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const bodySize = sorted.length ? parseFloat(sorted[0][0]) : 10;

  // Collect distinct sizes larger than body, sorted descending
  const larger = Object.keys(freq)
    .map(Number)
    .filter(s => s > bodySize * 1.15)
    .sort((a, b) => b - a);

  // Map size ranges → heading level (2 = largest, 3 = next, etc.)
  const sizeToLevel = {};
  larger.slice(0, 4).forEach((s, idx) => { sizeToLevel[s] = idx + 2; });

  return { bodySize, sizeToLevel };
}

function lineHeadingLevel(line, sizeToLevel, bodySize) {
  const maxH = Math.round(Math.max(...line.map(i => i.height)) * 2) / 2;
  return sizeToLevel[maxH] || 0;
}

// ── Lines → HTML ───────────────────────────────────────────────────────────

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

  for (const line of lines) {
    const t = line.map(i => i.str).join(' ').trim();
    if (!t) { flushPara(); flushList(); continue; }

    // Bullet
    const ulMatch = t.match(/^[\u2022\u2023\u25e6\u2714\u25cf•*\-]\s+(.+)/);
    if (ulMatch) {
      flushPara();
      if (listType !== 'ul') { flushList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${escHtml(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list ("1) item" — not a heading)
    const olMatch = t.match(/^(\d{1,2})[.)]\s+(.+)/);
    if (olMatch && !/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑÜ\w]/.test(t)) {
      flushPara();
      if (listType !== 'ol') { flushList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${escHtml(olMatch[2])}</li>`);
      continue;
    }

    flushList();

    // Callout keyword
    const calloutMatch = t.match(/^(IMPORTANTE|NOTA|TIP|WARNING|ATENCIÓN|ATENCION|RECUERDA)[:\s]/i);
    if (calloutMatch) {
      flushPara();
      const kw = calloutMatch[1].toLowerCase().replace('atencion', 'atención');
      const cls = { importante: 'callout-important', nota: 'callout-note', tip: 'callout-tip',
                    warning: 'callout-warning', atención: 'callout-warning', recuerda: 'callout-note' }[kw] || 'callout-note';
      out.push(`<div class="callout ${cls}"><strong>${escHtml(t)}</strong></div>`);
      continue;
    }

    para.push(t);
    if (/[.!?:;\u201d"'\]>»]$/.test(t)) flushPara();
  }

  flushPara();
  flushList();
  return out.join('\n');
}

// ── Clean heading text ─────────────────────────────────────────────────────

function cleanTitle(raw) {
  return raw
    .replace(/^\d+\.\d+(\.\d+)?\.?\s*/, '')
    .replace(/^\d{1,2}\.\s*/, '')
    .replace(/^(CAP[IÍ]TULO|MÓDULO|MODULO|PARTE|UNIDAD|SECCIÓN|SECCION|ANEXO)\s*\d*\s*[:\-–]?\s*/i, '')
    .trim();
}

// ── Build sections from annotated lines ────────────────────────────────────

function buildSections(annotatedLines) {
  // annotatedLines[i] = { lines: [...], level: 0|2|3, text: string }
  const h2List = annotatedLines.filter(l => l.level === 2);

  if (h2List.length === 0) {
    console.warn('[prebuild] No heading-sized lines detected; single section fallback');
    const content = linesToHtml(annotatedLines.map(l => l.lines).flat().map(i => [i]));
    return [{ id: 'contenido', slug: 'contenido', title: 'Contenido',
              excerpt: extractExcerpt(content), content, subsections: [], order: 0 }];
  }

  const seen = new Map();

  return h2List.map((h2Entry, sIdx) => {
    const h2Pos = annotatedLines.indexOf(h2Entry);
    const nextH2Pos = h2List[sIdx + 1] ? annotatedLines.indexOf(h2List[sIdx + 1]) : annotatedLines.length;
    const sectionEntries = annotatedLines.slice(h2Pos + 1, nextH2Pos);

    const subEntries = sectionEntries.filter(l => l.level === 3);
    const htmlParts = [];
    const subsections = [];

    if (subEntries.length === 0) {
      htmlParts.push(linesToHtml(sectionEntries.map(e => e.lines)));
    } else {
      const firstSubPos = sectionEntries.indexOf(subEntries[0]);
      if (firstSubPos > 0) htmlParts.push(linesToHtml(sectionEntries.slice(0, firstSubPos).map(e => e.lines)));

      subEntries.forEach((sub, subIdx) => {
        const subPos = sectionEntries.indexOf(sub);
        const nextSubPos = subEntries[subIdx + 1] ? sectionEntries.indexOf(subEntries[subIdx + 1]) : sectionEntries.length;
        const subBodyEntries = sectionEntries.slice(subPos + 1, nextSubPos);
        const subTitle = cleanTitle(sub.text);
        const subId = slugify(subTitle);
        htmlParts.push(`<h3 id="${subId}">${escHtml(subTitle)}</h3>`);
        htmlParts.push(linesToHtml(subBodyEntries.map(e => e.lines)));
        if (subTitle) subsections.push({ id: subId, title: subTitle });
      });
    }

    const title = cleanTitle(h2Entry.text);
    let baseSlug = slugify(title) || `seccion-${sIdx}`;
    let slug = baseSlug; let c = 1;
    while (seen.has(slug)) slug = `${baseSlug}-${c++}`;
    seen.set(slug, true);

    const content = `<h2 id="${slug}">${escHtml(title)}</h2>\n${htmlParts.join('\n')}`;
    return { id: slug, slug, title, excerpt: extractExcerpt(content), content, subsections, order: sIdx };
  }).filter(s => s.title && stripTags(s.content).length > 40);
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await fs.access(PDF_PATH).catch(() => {
    throw new Error(`PDF not found: ${PDF_PATH}\nPlace master-document.pdf in public/content/`);
  });

  console.log(`[prebuild] Reading ${PDF_PATH}…`);
  const pdfBuffer = await fs.readFile(PDF_PATH);

  // Extract text items with font heights using pdfjs-dist
  const items = await extractPdfItems(pdfBuffer);
  console.log(`[prebuild] Extracted ${items.length.toLocaleString()} text items`);

  // Group into visual lines
  const rawLines = groupIntoLines(items);

  // Filter page numbers (lone short numeric lines)
  const lines = rawLines.filter(line => {
    const t = line.map(i => i.str).join('').trim();
    return !(t.length <= 4 && /^\d+$/.test(t));
  });

  // Compute font size → heading level mapping
  const { bodySize, sizeToLevel } = buildFontSizeMap(lines);
  console.log(`[prebuild] Body font size: ${bodySize}pt, heading sizes: ${Object.keys(sizeToLevel).join(', ')}pt`);

  // Annotate each line with its heading level
  const annotated = lines.map(line => ({
    lines: line,
    level: lineHeadingLevel(line, sizeToLevel, bodySize),
    text: line.map(i => i.str).join(' ').trim(),
  }));

  const sections = buildSections(annotated);

  console.log(`[prebuild] ${sections.length} sections parsed:`);
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
    id: i, slug: s.slug, title: s.title,
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
      content: `<div class="callout callout-warning"><strong>Error:</strong> No se pudo procesar <code>master-document.pdf</code>.<br/><pre>${escHtml(err.message)}</pre></div>`,
      subsections: [],
      order: 0,
    }],
  };
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(fallback, null, 2), 'utf-8');
  console.log('[prebuild] Fallback content written.');
});
