'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Props {
  html: string;
}

export default function ContentRenderer({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Add slug-based IDs to all heading elements for anchor links
    el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      if (heading.id) return;
      const text = heading.textContent || '';
      const id = text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
      if (id) heading.id = id;
    });

    // Open external links in new tab
    el.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    // Wrap bare <table> elements (not already wrapped)
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
