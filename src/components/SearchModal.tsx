'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, X, Hash, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SectionMeta {
  id: string;
  slug: string;
  title: string;
  subsections: { id: string; title: string }[];
}

interface Props {
  sections: SectionMeta[];
}

export default function SearchModal({ sections }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = query.trim()
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.subsections.some((sub) =>
            sub.title.toLowerCase().includes(query.toLowerCase())
          )
      )
    : sections.slice(0, 6);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

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
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
                border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <Search size={16} className="text-indigo-500 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar secciones o temas…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent
                    text-slate-900 dark:text-white placeholder-slate-400"
                />
                <button onClick={close} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={16} />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {query && results.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">
                    Sin resultados para &quot;{query}&quot;
                  </p>
                ) : (
                  <ul className="py-2">
                    {!query && (
                      <li className="px-4 pt-1 pb-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Secciones
                      </li>
                    )}
                    {results.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/${s.slug}`}
                          onClick={close}
                          className="flex items-center gap-3 px-4 py-2.5
                            hover:bg-indigo-50 dark:hover:bg-indigo-950/40
                            transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60
                            flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                            <Hash size={12} className="text-indigo-500 dark:text-indigo-400" />
                          </div>
                          <span className="flex-1 text-sm text-slate-800 dark:text-slate-200
                            group-hover/item:text-indigo-700 dark:group-hover/item:text-indigo-300 transition-colors">
                            {s.title}
                          </span>
                          <ArrowRight size={13} className="text-slate-300 dark:text-slate-700
                            group-hover/item:text-indigo-400 transition-colors" />
                        </Link>
                        {query && s.subsections
                          .filter((sub) => sub.title.toLowerCase().includes(query.toLowerCase()))
                          .map((sub) => (
                            <a
                              key={sub.id}
                              href={`/${s.slug}#${sub.id}`}
                              onClick={close}
                              className="flex items-center gap-3 pl-14 pr-4 py-2
                                hover:bg-slate-50 dark:hover:bg-slate-800/50
                                transition-colors text-xs text-slate-500 dark:text-slate-400
                                hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              ↳ {sub.title}
                            </a>
                          ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800
                flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">↵</kbd> Abrir
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">Esc</kbd> Cerrar
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
