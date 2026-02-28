import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

const ROOT = process.cwd();
const DOCX_FILE = 'La_Guia_Definitiva_del_NOC.docx';
const OUTPUT_DIR = path.join(ROOT, 'src', 'content');
const OUTPUT = path.join(OUTPUT_DIR, 'sections.json');

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
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim();
}

function extractExcerpt(html, maxLen = 200) {
  const text = stripTags(html);
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text;
}

function parseHtmlIntoSections(html) {
  // Try h1 first, fall back to h2
  let tagName = 'h1';
  if (!/<h1[\s>]/i.test(html)) tagName = 'h2';
  if (!/<h2[\s>]/i.test(html)) tagName = 'h3';

  const splitRe = new RegExp(`(?=<${tagName}[\\s>])`, 'i');
  const parts = html.split(splitRe).filter(p => p.trim());

  if (parts.length <= 1) {
    return [{
      id: 'guia-noc',
      slug: 'guia-noc',
      title: 'Guía Definitiva del NOC',
      excerpt: extractExcerpt(html),
      content: html,
      subsections: [],
      order: 0,
    }];
  }

  const sections = [];
  const seen = new Map();

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const headingMatch = part.match(new RegExp(`<${tagName}[^>]*>(.*?)<\\/${tagName}>`, 'i'));
    if (!headingMatch) continue;

    const title = stripTags(headingMatch[1]).trim();
    if (!title) continue;

    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = `section-${i}`;
    let slug = baseSlug;
    let count = 1;
    while (seen.has(slug)) { slug = `${baseSlug}-${count++}`; }
    seen.set(slug, true);

    // Extract subsections (next heading level)
    const subTag = tagName === 'h1' ? 'h2' : tagName === 'h2' ? 'h3' : 'h4';
    const subRe = new RegExp(`<${subTag}[^>]*>(.*?)<\\/${subTag}>`, 'gi');
    const subsections = [];
    let sm;
    while ((sm = subRe.exec(part)) !== null) {
      const subTitle = stripTags(sm[1]).trim();
      if (subTitle) subsections.push({ id: slugify(subTitle), title: subTitle });
    }

    sections.push({
      id: slug,
      slug,
      title,
      excerpt: extractExcerpt(part),
      content: part,
      subsections,
      order: i,
    });
  }

  return sections;
}

// Enhance HTML: add callout styling, wrap tables
function enhanceHtml(html) {
  // Wrap tables for responsive scroll
  html = html.replace(/<table/g, '<div class="table-wrapper"><table').replace(/<\/table>/g, '</table></div>');

  // Detect callout-like paragraphs
  html = html.replace(/<p><strong>(Importante|Nota|Tip|Warning|Atención|Recuerda)[:\s]*(.*?)<\/strong>(.*?)<\/p>/gi,
    (_, kind, boldRest, rest) => {
      const kindMap = {
        importante: 'callout-important',
        nota: 'callout-note',
        tip: 'callout-tip',
        warning: 'callout-warning',
        atención: 'callout-warning',
        recuerda: 'callout-note',
      };
      const cls = kindMap[kind.toLowerCase()] || 'callout-note';
      return `<div class="callout ${cls}"><strong>${kind}:</strong> ${boldRest}${rest}</div>`;
    }
  );

  return html;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  try {
    const docxPath = path.join(ROOT, DOCX_FILE);
    console.log(`[prebuild] Reading: ${docxPath}`);
    const buffer = await fs.readFile(docxPath);

    const { value: rawHtml, messages } = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
          "p[style-name='Code'] => pre:fresh",
        ],
        convertImage: mammoth.images.inline(() => ({ src: '' })),
      }
    );

    if (messages.length) {
      messages.forEach(m => console.log(`  [mammoth] ${m.type}: ${m.message}`));
    }

    const html = enhanceHtml(rawHtml);
    const sections = parseHtmlIntoSections(html);

    console.log(`[prebuild] Parsed ${sections.length} sections:`);
    sections.forEach((s, i) =>
      console.log(`  ${String(i + 1).padStart(2, '0')}. [${s.id}] ${s.title} (${s.subsections.length} sub)`)
    );

    const data = {
      title: 'La Guía Definitiva del NOC',
      description:
        'Manual completo para convertirse en NOC Analyst: fundamentos, networking, observabilidad, incident management, herramientas y roadmap profesional.',
      lastUpdated: new Date().toISOString(),
      totalSections: sections.length,
      sections,
    };

    await fs.writeFile(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[prebuild] ✓ Written → ${OUTPUT}`);
  } catch (err) {
    console.error('[prebuild] ERROR:', err.message);
    const fallback = {
      title: 'La Guía Definitiva del NOC',
      description: '',
      lastUpdated: new Date().toISOString(),
      totalSections: 1,
      sections: [
        {
          id: 'error',
          slug: 'error',
          title: 'Error al cargar el documento',
          excerpt: err.message,
          content: `<div class="callout callout-warning"><strong>Error:</strong> No se pudo procesar <code>${DOCX_FILE}</code>.<br/><code>${err.message}</code></div><p>Verificá que el archivo esté en la raíz del repositorio y que tenga extensión <code>.docx</code>.</p>`,
          subsections: [],
          order: 0,
        },
      ],
    };
    await fs.writeFile(OUTPUT, JSON.stringify(fallback, null, 2), 'utf-8');
    console.log('[prebuild] Fallback content written.');
  }
}

await main();
