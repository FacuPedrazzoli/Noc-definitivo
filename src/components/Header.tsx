'use client';

import Link from 'next/link';
import { BookOpen, Moon, Sun, Menu, X, BookOpenCheck, LayoutDashboard } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import SearchModal from './SearchModal';
import { useMobileMenu, useReadingMode } from './Providers';

interface SectionMeta {
  id: string;
  slug: string;
  title: string;
  subsections: { id: string; title: string }[];
}

interface Props {
  sections: SectionMeta[];
}

export default function Header({ sections }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isOpen, toggle } = useMobileMenu();
  const { active: readingMode, toggle: toggleReading } = useReadingMode();

  useEffect(() => setMounted(true), []);

  return (
    <header
      className="fixed top-[3px] left-0 right-0 h-14 z-40
        bg-white/90 dark:bg-slate-950/90 backdrop-blur-md
        border-b border-slate-200/80 dark:border-slate-800/80"
    >
      {/* Gradient accent underline */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px]
        bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-violet-500/0
        dark:via-indigo-400/30" />

      <div className="flex items-center justify-between h-full px-4 max-w-screen-2xl mx-auto">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg
              text-slate-600 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
              flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-indigo-900/30
              group-hover:scale-105 transition-transform">
              <BookOpen size={14} className="text-white" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                NOC Handbook
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Guía Definitiva
              </span>
            </div>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          <SearchModal sections={sections} />

          {mounted && (
            <>
              <button
                onClick={toggleReading}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors
                  ${readingMode
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                aria-label={readingMode ? 'Salir del modo lectura' : 'Modo lectura'}
                title={readingMode ? 'Salir del modo lectura' : 'Modo lectura (oculta sidebars)'}
              >
                {readingMode ? <LayoutDashboard size={16} /> : <BookOpenCheck size={16} />}
              </button>

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 flex items-center justify-center rounded-lg
                  text-slate-600 dark:text-slate-400
                  hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
