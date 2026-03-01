'use client';

import { useState, useEffect, useRef } from 'react';
import { BookMarked, ChevronUp, ChevronDown } from 'lucide-react';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('toc-collapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(v => {
      localStorage.setItem('toc-collapsed', String(!v));
      return !v;
    });
  };

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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookMarked size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider">
            En esta página
          </span>
        </div>
        <button
          onClick={toggleCollapse}
          className="p-1 rounded text-slate-300 dark:text-slate-700
            hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
          title={isCollapsed ? 'Mostrar' : 'Ocultar'}
        >
          {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {!isCollapsed && (
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
                  className={`flex items-center gap-1.5 py-1 pr-2 text-[13px] leading-snug rounded transition-all duration-150 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {isActive && (
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                  )}
                  {!isActive && h.level === 3 && (
                    <span className="shrink-0 text-slate-300 dark:text-slate-700 text-xs leading-none">—</span>
                  )}
                  <span className="truncate">{h.text}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
