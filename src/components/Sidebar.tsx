'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileMenu } from './Providers';

interface SectionMeta {
  id: string;
  slug: string;
  title: string;
  subsections: { id: string; title: string }[];
}

interface Props {
  sections: SectionMeta[];
  totalSections: number;
}

const SECTION_ICONS = [
  '📖', '🌐', '👁️', '🚨', '🛠️', '🗺️', '⚡', '🔒', '📊', '🤝',
  '🎯', '💡', '🔧', '📋', '🏆', '🧠', '🔍', '⚙️', '🌟', '📡',
];

export default function Sidebar({ sections, totalSections }: Props) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { isOpen, close } = useMobileMenu();

  // Auto-expand active section
  useEffect(() => {
    const active = sections.find((s) => `/${s.slug}` === pathname);
    if (active) setExpanded(active.id);
  }, [pathname, sections]);

  const inner = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <LayoutDashboard size={13} />
          <span>Contenido</span>
          <span className="ml-auto bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400
            border border-indigo-100 dark:border-indigo-900 rounded-full px-2 py-0.5 font-mono text-[10px]">
            {totalSections}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* Home link */}
        <Link
          href="/"
          onClick={close}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1 text-sm transition-all duration-150
            ${pathname === '/'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
        >
          <span className="text-base">🏠</span>
          <span>Inicio</span>
        </Link>

        <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-1" />

        {/* Sections */}
        {sections.map((section, i) => {
          const href = `/${section.slug}`;
          const isActive = pathname === href;
          const isExpanded = expanded === section.id || isActive;

          return (
            <div key={section.id} className="mb-0.5">
              <div className="flex items-center gap-1">
                <Link
                  href={href}
                  onClick={close}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                    transition-all duration-150 min-w-0
                    ${isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  <span className="text-base shrink-0 w-5 text-center" aria-hidden>
                    {SECTION_ICONS[i % SECTION_ICONS.length]}
                  </span>
                  <span className="truncate">{section.title}</span>
                </Link>
                {section.subsections.length > 0 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : section.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                      hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    aria-label="Toggle subsections"
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && section.subsections.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 mt-0.5 mb-1 pl-3 border-l-2 border-indigo-100 dark:border-indigo-900/60">
                      {section.subsections.map((sub) => (
                        <a
                          key={sub.id}
                          href={`${href}#${sub.id}`}
                          onClick={close}
                          className="block py-1.5 px-2 text-xs rounded-lg
                            text-slate-500 dark:text-slate-500
                            hover:text-indigo-600 dark:hover:text-indigo-400
                            hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20
                            transition-colors truncate"
                        >
                          {sub.title}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center">
          Guía Definitiva del NOC · v1.0
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-[59px] bottom-0 w-72
        border-r border-slate-200 dark:border-slate-800
        bg-white dark:bg-slate-950 z-30">
        {inner}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={close}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72
                border-r border-slate-200 dark:border-slate-800
                bg-white dark:bg-slate-950 z-50 pt-[59px]"
            >
              {inner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
