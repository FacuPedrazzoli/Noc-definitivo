'use client';

import { useState, useEffect, useRef } from 'react';
import { BookMarked } from 'lucide-react';

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface Props {
  headings: TocHeading[];
}

export default function TOC({ headings }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const headingEls = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    if (headingEls.length === 0) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveId(topmost.target.id);
        }
      },
      { rootMargin: '-64px 0px -55% 0px', threshold: 0 }
    );

    headingEls.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="Tabla de contenidos">
      <div className="flex items-center gap-2 mb-3">
        <BookMarked size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider">
          En esta página
        </span>
      </div>

      <ul className="space-y-0.5">
        {headings.map((h) => {
          const isActive = activeId === h.id;
          const indent = (h.level - 2) * 12;
          return (
            <li key={h.id} style={{ paddingLeft: `${indent}px` }}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(h.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setActiveId(h.id);
                    history.pushState(null, '', `#${h.id}`);
                  }
                }}
                className={`block py-1 pr-2 text-[13px] leading-snug rounded transition-all duration-150 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {h.level === 3 && (
                  <span className="text-slate-300 dark:text-slate-700 mr-1">—</span>
                )}
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
