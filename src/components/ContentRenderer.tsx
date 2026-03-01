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
