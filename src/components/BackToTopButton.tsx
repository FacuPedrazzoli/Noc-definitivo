'use client';

export default function BackToTopButton() {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="inline-flex items-center gap-2 text-xs text-slate-400 dark:text-slate-600
        hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
    >
      ↑ Volver arriba
    </button>
  );
}
