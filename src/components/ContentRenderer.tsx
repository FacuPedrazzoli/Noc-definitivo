'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Props {
  html: string;
}

function slugifyText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export default function ContentRenderer({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ── Headings: add IDs + anchor link icons ──────────────────────────
    el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      if (!heading.id) {
        const id = slugifyText(heading.textContent || '');
        if (id) heading.id = id;
      }
      if (heading.id && !heading.querySelector('.anchor-link')) {
        const a = document.createElement('a');
        a.href = `#${heading.id}`;
        a.className = 'anchor-link';
        a.setAttribute('aria-label', 'Enlace a esta sección');
        a.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', `#${heading.id}`);
        });
        heading.appendChild(a);
      }
    });

    // ── Code blocks: add copy button + detect mermaid ──────────────────
    el.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;

      const code = pre.querySelector('code');
      const codeText = pre.textContent || '';

      // Check for mermaid diagrams
      const isMermaid =
        code?.className?.includes('mermaid') ||
        /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|gitGraph|journey)\b/im.test(
          codeText.trim()
        );

      if (isMermaid) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-wrapper';
        wrapper.dataset.mermaid = codeText.trim();
        pre.replaceWith(wrapper);
        import('mermaid').then((mod) => {
          const mermaid = mod.default;
          mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'base',
            themeVariables: { primaryColor: '#6366f1', primaryTextColor: '#1e293b', lineColor: '#94a3b8' },
          });
          const id = `mermaid-${Math.random().toString(36).slice(2, 8)}`;
          mermaid.render(id, codeText.trim()).then(({ svg }) => {
            wrapper.innerHTML = svg;
          }).catch(() => {
            wrapper.innerHTML = `<pre class="text-xs text-red-400 p-3">${codeText}</pre>`;
          });
        });
        return;
      }

      // Copy button for regular code blocks
      pre.style.position = 'relative';
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copiar</span>';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeText).then(() => {
          btn.innerHTML =
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Copiado</span>';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML =
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copiar</span>';
            btn.classList.remove('copied');
          }, 2000);
        });
      });
      pre.appendChild(btn);
    });

    // ── External links → new tab ───────────────────────────────────────
    el.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    // ── Tables → responsive wrapper ────────────────────────────────────
    el.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('table-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });

    // ── Glossary table → visual cards ──────────────────────────────────
    el.querySelectorAll('.table-wrapper table, table').forEach((table) => {
      const ths = Array.from(table.querySelectorAll('thead th'));
      const headers = ths.map(th => th.textContent?.trim().toLowerCase() || '');

      const terminoIdx = headers.findIndex(h =>
        h.includes('término') || h.includes('termino') || h === 'term'
      );
      if (terminoIdx === -1) return;

      const defIdx = headers.findIndex(h =>
        h.includes('definici') || h.includes('descrip') || h.includes('definition')
      );
      const ctxIdx = headers.findIndex(h =>
        h.includes('context') || h.includes('uso') || h.includes('categorí') || h.includes('categori')
      );

      const rows = Array.from(table.querySelectorAll('tbody tr'));
      if (rows.length < 3) return; // too small to be worth converting

      const CATEGORY_MAP: Record<string, string> = {
        'iso': 'protocol', 'protocolo': 'protocol', 'mensajer': 'protocol',
        'red': 'network', 'network': 'network', 'networking': 'network',
        'conectiv': 'network',
        'seguridad': 'security', 'security': 'security', 'pci': 'security',
        'emv': 'security', 'criptograf': 'security',
        'monitoreo': 'monitoring', 'observab': 'monitoring', 'métrica': 'monitoring',
        'sre': 'sre', 'confiabilidad': 'sre', 'slo': 'sre', 'sli': 'sre',
        'cultura': 'sre', 'gestión': 'sre',
        'pago': 'payments', 'payment': 'payments', 'transacc': 'payments',
        'adquir': 'payments', 'emisor': 'payments', 'autorizac': 'payments',
        'incident': 'incident', 'incidente': 'incident', 'response': 'incident',
        'proceso': 'incident',
        'hardware': 'default', 'identificac': 'default', 'arquitectura': 'default',
        'rol': 'default', 'legal': 'default', 'negocio': 'default',
      };

      function getBadgeClass(ctx: string): string {
        const lower = ctx.toLowerCase();
        for (const [key, cls] of Object.entries(CATEGORY_MAP)) {
          if (lower.includes(key)) return `glossary-badge glossary-badge-${cls}`;
        }
        return 'glossary-badge glossary-badge-default';
      }

      // Build A-Z nav
      const firstLetters = new Set<string>();
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const term = cells[terminoIdx]?.textContent?.trim() || '';
        const letter = term.replace(/^\*+/, '').charAt(0).toUpperCase();
        if (letter) firstLetters.add(letter);
      });

      const azNav = document.createElement('div');
      azNav.className = 'glossary-az-nav';
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        const btn = document.createElement('a');
        btn.className = firstLetters.has(letter)
          ? 'glossary-az-btn'
          : 'glossary-az-btn inactive';
        btn.textContent = letter;
        if (firstLetters.has(letter)) {
          btn.href = `#glos-${letter}`;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(`glos-${letter}`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
        azNav.appendChild(btn);
      });

      // Build card grid
      const grid = document.createElement('div');
      grid.className = 'glossary-grid';

      let currentLetter = '';
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (!cells.length) return;

        const termEl = cells[terminoIdx];
        const termText = termEl?.textContent?.replace(/\*/g, '').trim() || '';
        const termHtml = termEl?.innerHTML || termText;
        const defHtml = defIdx >= 0 ? (cells[defIdx]?.innerHTML || '') : '';
        const ctxText = ctxIdx >= 0 ? (cells[ctxIdx]?.textContent?.trim() || '') : '';

        if (!termText) return;

        const slug = termText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 40);
        const firstLetter = termText.replace(/^\*+/, '').charAt(0).toUpperCase();

        // Insert letter anchor when letter changes
        if (firstLetter !== currentLetter) {
          currentLetter = firstLetter;
          const anchor = document.createElement('div');
          anchor.id = `glos-${firstLetter}`;
          anchor.style.cssText = 'grid-column: 1/-1; padding: 4px 0 2px; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; scroll-margin-top:90px;';
          anchor.textContent = firstLetter;
          grid.appendChild(anchor);
        }

        const card = document.createElement('div');
        card.className = 'glossary-card';
        card.id = `glosario-${slug}`;

        const COPY_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
        const CHECK_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

        card.innerHTML = `
          <div class="glossary-card-header">
            ${ctxText ? `<span class="${getBadgeClass(ctxText)}">${ctxText}</span>` : '<span></span>'}
            <button class="glossary-copy-btn" data-term="${termText.replace(/"/g, '&quot;')}" title="Copiar término">${COPY_SVG}</button>
          </div>
          <div class="glossary-card-term">${termHtml}</div>
          ${defHtml ? `<div class="glossary-card-def">${defHtml}</div>` : ''}
        `;

        const copyBtn = card.querySelector('.glossary-copy-btn') as HTMLButtonElement;
        copyBtn?.addEventListener('click', () => {
          const term = copyBtn.dataset.term || '';
          navigator.clipboard.writeText(term).then(() => {
            copyBtn.innerHTML = CHECK_SVG;
            setTimeout(() => { copyBtn.innerHTML = COPY_SVG; }, 2000);
          });
        });

        grid.appendChild(card);
      });

      // Replace table (or wrapper) with az nav + grid
      const container = document.createElement('div');
      container.appendChild(azNav);
      container.appendChild(grid);

      const parent = table.closest('.table-wrapper') || table;
      parent.replaceWith(container);
    });
  }, [html]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="doc-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
