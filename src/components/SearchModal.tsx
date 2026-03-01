'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, Hash, ArrowRight, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SectionMeta {
  id: string;
  slug: string;
  title: string;
  subsections: { id: string; title: string }[];
}

interface SearchDoc {
  id: number;
  slug: string;
  title: string;
  text: string;
}

interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
  type: 'full-text' | 'title';
}

interface Props {
  sections: SectionMeta[];
}

function getExcerpt(text: string, query: string, maxLen = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen) + '…';
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export default function SearchModal({ sections }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchDocs, setSearchDocs] = useState<SearchDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // Load full-text search index on first open
  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true;
      setLoading(true);
      fetch('/search-index.json')
        .then((r) => r.json())
        .then((data: SearchDoc[]) => setSearchDocs(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  // Compute results
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return sections.slice(0, 7).map((s) => ({
        slug: s.slug,
        title: s.title,
        excerpt: '',
        type: 'title' as const,
      }));
    }
    if (searchDocs.length > 0) {
      return searchDocs
        .filter((d) => d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q))
        .slice(0, 8)
        .map((d) => ({
          slug: d.slug,
          title: d.title,
          excerpt: getExcerpt(d.text, q),
          type: 'full-text' as const,
        }));
    }
    // Fallback: title-only search while loading
    return sections
      .filter((s) => s.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map((s) => ({ slug: s.slug, title: s.title, excerpt: '', type: 'title' as const }));
  }, [query, searchDocs, sections]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm
          border border-slate-200 dark:border-slate-700
          text-slate-500 dark:text-slate-400
          hover:border-indigo-300 dark:hover:border-indigo-600
          bg-slate-50 dark:bg-slate-900/60
          transition-all duration-150 group"
      >
        <Search size={13} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
        <span className="hidden sm:inline text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
          Buscar…
        </span>
        <span className="hidden sm:inline text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
          ⌘K
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
                border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                {loading ? (
                  <Loader2 size={16} className="text-indigo-500 shrink-0 animate-spin" />
                ) : (
                  <Search size={16} className="text-indigo-500 shrink-0" />
                )}
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar en toda la documentación…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent
                    text-slate-900 dark:text-white placeholder-slate-400"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mr-1"
                  >
                    <X size={14} />
                  </button>
                )}
                <button onClick={close} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={16} />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[28rem] overflow-y-auto">
                {query && results.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <FileText size={28} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-slate-400">
                      Sin resultados para <strong className="text-slate-600 dark:text-slate-300">&quot;{query}&quot;</strong>
                    </p>
                  </div>
                ) : (
                  <ul className="py-2">
                    <li className="px-4 pt-1 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {query ? `${results.length} resultados` : 'Secciones'}
                    </li>
                    {results.map((r) => (
                      <li key={r.slug}>
                        <Link
                          href={`/${r.slug}`}
                          onClick={close}
                          className="flex items-start gap-3 px-4 py-2.5
                            hover:bg-indigo-50 dark:hover:bg-indigo-950/40
                            transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60
                            flex items-center justify-center shrink-0 mt-0.5
                            border border-indigo-100 dark:border-indigo-900">
                            <Hash size={12} className="text-indigo-500 dark:text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium
                              group-hover/item:text-indigo-700 dark:group-hover/item:text-indigo-300 transition-colors truncate">
                              {r.title}
                            </p>
                            {r.excerpt && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {r.excerpt}
                              </p>
                            )}
                          </div>
                          <ArrowRight size={13} className="text-slate-300 dark:text-slate-700 mt-1 shrink-0
                            group-hover/item:text-indigo-400 transition-colors" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800
                flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">↵</kbd> Abrir
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">Esc</kbd> Cerrar
                  </span>
                </div>
                {searchDocs.length > 0 && (
                  <span className="text-indigo-400 dark:text-indigo-600 font-medium">
                    {searchDocs.length} secciones indexadas
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
