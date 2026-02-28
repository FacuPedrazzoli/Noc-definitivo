import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');

const SOURCES = [
  {
    kind: 'pdf',
    file: 'El-Libro-Definitivo-del-SRE-de-Pagos-Globales.pdf',
    title: 'El Libro Definitivo del SRE de Pagos Globales'
  },
  {
    kind: 'docx',
    file: 'Plan_Transicion_NOC_a_SRE_Payments.docx',
    title: 'Plan de Transición NOC a SRE (Payments)'
  },
  {
    kind: 'pdf',
    file: 'SECCIÓN 1 FUNDAMENTOS DEL ECOSISTEMA DE PAGOS (Nivel Interno Corporativo).pdf',
    title: 'SECCIÓN 1 FUNDAMENTOS DEL ECOSISTEMA DE PAGOS (Nivel Interno Corporativo)'
  }
];

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(input) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function textToHtmlParagraphs(text) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const out = [];
  let buf = [];

  const flush = () => {
    if (!buf.length) return;
    const p = escapeHtml(buf.join(' '));
    out.push(`<p>${p}</p>`);
    buf = [];
  };

  for (const line of lines) {
    const isHeadingLike =
      /^#{1,6}\s+/.test(line) ||
      (/^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s:\-→()]{12,}$/.test(line) && line.length < 120);

    if (isHeadingLike) {
      flush();
      const clean = line.replace(/^#{1,6}\s+/, '');
      const id = slugify(clean);
      out.push(`<h3 id="${id}">${escapeHtml(clean)}</h3>`);
      continue;
    }

    if (line.length <= 2) {
      flush();
      continue;
    }

    buf.push(line);

    if (buf.join(' ').length > 700) flush();
  }

  flush();
  return out.join('\n');
}

async function readPdfToText(absPath) {
  const data = await fs.readFile(absPath);
  const res = await pdf(data);
  return res.text || '';
}

async function readDocxToHtml(absPath) {
  const data = await fs.readFile(absPath);
  const res = await mammoth.convertToHtml({ buffer: data }, {
    styleMap: []
  });
  return res.value || '';
}

function wrapSection({ title, html, sourceFile }) {
  const id = slugify(title);
  return {
    id,
    title,
    navLabel: title,
    html: `\n<section class="docSection" id="${id}" data-source="${escapeHtml(sourceFile)}">\n  <h2>${escapeHtml(title)}</h2>\n  <p><strong>Fuente:</strong> <a href="./${encodeURIComponent(sourceFile)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceFile)}</a></p>\n  ${html}\n</section>\n`
  };
}

async function main() {
  await fs.mkdir(DIST_DIR, { recursive: true });

  const template = await fs.readFile(path.join(ROOT, 'template.html'), 'utf8');

  const sections = [];

  for (const s of SOURCES) {
    const abs = path.join(ROOT, s.file);
    try {
      // Copy original file to dist for fallback reading in the deployed site
      try {
        await fs.copyFile(abs, path.join(DIST_DIR, s.file));
      } catch {
        // If copy fails we still attempt conversion; errors will be shown in the section
      }

      if (s.kind === 'pdf') {
        const text = await readPdfToText(abs);
        const html = textToHtmlParagraphs(text);
        sections.push(wrapSection({ title: s.title, html, sourceFile: s.file }));
      } else {
        const htmlRaw = await readDocxToHtml(abs);
        const html = htmlRaw || '<p>(Documento vacío o no convertible.)</p>';
        sections.push(wrapSection({ title: s.title, html, sourceFile: s.file }));
      }
    } catch (e) {
      sections.push(wrapSection({
        title: s.title,
        html: `<p>No se pudo convertir <code>${escapeHtml(s.file)}</code>.</p><pre><code>${escapeHtml(String(e && e.message ? e.message : e))}</code></pre>`,
        sourceFile: s.file
      }));
    }
  }

  const navItemsHtml = sections.map(sec => {
    return `\n<a href="#${sec.id}" data-target="${sec.id}">\n  <i class="fa-solid fa-file-lines" aria-hidden="true"></i>\n  <div class="meta">\n    <strong>${escapeHtml(sec.navLabel)}</strong>\n    <span>Contenido generado desde fuente</span>\n  </div>\n</a>`;
  }).join('\n');

  const contentHtml = sections.map(s => s.html).join('\n');

  const outHtml = template
    .replace('<!--NAV_ITEMS-->', navItemsHtml)
    .replace('<!--CONTENT_ITEMS-->', contentHtml);

  await fs.writeFile(path.join(DIST_DIR, 'index.html'), outHtml, 'utf8');
  await fs.writeFile(path.join(ROOT, 'index.html'), outHtml, 'utf8');

  console.log('Build complete: dist/index.html and index.html');
}

await main();
