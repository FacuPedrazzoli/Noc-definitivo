import { getSectionBySlug, getAllSections, getAdjacentSections } from '@/lib/content';
import { notFound } from 'next/navigation';
import ContentRenderer from '@/components/ContentRenderer';
import BackToTopButton from '@/components/BackToTopButton';
import TocPanel from '@/components/TocPanel';
import type { TocHeading } from '@/components/TOC';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Hash, Home, Clock } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: { section: string };
}

export function generateStaticParams() {
  return getAllSections().map((s) => ({ section: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = getSectionBySlug(params.section);
  if (!section) return { title: 'No encontrado' };
  return {
    title: section.title,
    description: section.excerpt,
    openGraph: { title: section.title, description: section.excerpt },
  };
}

function estimateReadTime(html: string) {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function slugifyHeading(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function extractHeadings(html: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const re = /<(h[2-4])\b[^>]*>(.*?)<\/h[2-4]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = parseInt(m[1][1], 10);
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    const id = slugifyHeading(text);
    if (text && id) headings.push({ id, text, level });
  }
  return headings;
}

export default function SectionPage({ params }: Props) {
  const section = getSectionBySlug(params.section);
  if (!section) notFound();

  const { prev, next } = getAdjacentSections(params.section);
  const readTime = estimateReadTime(section!.content);
  const allSections = getAllSections();
  const sectionNumber = allSections.findIndex((s) => s.slug === params.section) + 1;
  const headings = extractHeadings(section!.content);

  return (
    <div className="flex min-h-screen">
      {/* ── Main content column ── */}
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 xl:pr-8 py-8 lg:py-12 max-w-[760px]">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-600 mb-8 flex-wrap">
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
            <Home size={11} />
            Inicio
          </Link>
          <ChevronRight size={11} />
          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px] sm:max-w-none">
            {section!.title}
          </span>
        </nav>

        {/* Section header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold
              bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400
              border border-indigo-100 dark:border-indigo-900/60
              rounded-full px-3 py-1">
              <Hash size={10} />
              Sección {sectionNumber}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600">
              <Clock size={11} />
              {readTime} min de lectura
            </span>
          </div>
        </div>

        {/* Inline TOC — visible on < xl, hidden on xl (shown in right sidebar instead) */}
        {headings.length > 2 && (
          <div className="xl:hidden mb-10 p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20
            border border-indigo-100 dark:border-indigo-900/40">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-3">
              En esta sección
            </p>
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {headings.filter(h => h.level === 2).map((h, i) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400
                      hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/60
                      flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {i + 1}
                    </span>
                    <span className="truncate group-hover:underline underline-offset-2">{h.text}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Main content */}
        <ContentRenderer html={section!.content} />

        {/* Navigation */}
        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-4">
            {prev ? (
              <Link
                href={`/${prev.slug}`}
                className="group flex flex-col gap-1 p-4 rounded-xl
                  border border-slate-200 dark:border-slate-800
                  hover:border-indigo-300 dark:hover:border-indigo-700
                  bg-white dark:bg-slate-900 hover:shadow-md transition-all"
              >
                <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600 font-medium">
                  <ChevronLeft size={12} /> Anterior
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300
                  group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <Link
                href="/"
                className="group flex flex-col gap-1 p-4 rounded-xl
                  border border-slate-200 dark:border-slate-800
                  hover:border-indigo-300 dark:hover:border-indigo-700
                  bg-white dark:bg-slate-900 hover:shadow-md transition-all"
              >
                <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600 font-medium">
                  <ChevronLeft size={12} /> Volver
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300
                  group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Inicio
                </span>
              </Link>
            )}

            {next ? (
              <Link
                href={`/${next.slug}`}
                className="group flex flex-col gap-1 p-4 rounded-xl text-right
                  border border-slate-200 dark:border-slate-800
                  hover:border-indigo-300 dark:hover:border-indigo-700
                  bg-white dark:bg-slate-900 hover:shadow-md transition-all"
              >
                <span className="flex items-center gap-1.5 justify-end text-xs text-slate-400 dark:text-slate-600 font-medium">
                  Siguiente <ChevronRight size={12} />
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300
                  group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {next.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* Back to top */}
        <div className="mt-8 text-center">
          <BackToTopButton />
        </div>
      </div>

      {/* ── Right TOC column (xl+) ── */}
      <TocPanel headings={headings} />
    </div>
  );
}
