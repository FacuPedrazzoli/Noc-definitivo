import Link from 'next/link';
import { getContent } from '@/lib/content';
import {
  BookOpen, ChevronRight, Zap, Clock, Users,
  ArrowRight, Hash, GraduationCap,
} from 'lucide-react';

const SECTION_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-indigo-500 to-violet-600',
  'from-violet-500 to-purple-600',
  'from-purple-500 to-pink-600',
  'from-pink-500 to-rose-600',
  'from-rose-500 to-red-600',
  'from-orange-500 to-amber-600',
  'from-amber-500 to-yellow-600',
  'from-yellow-500 to-lime-600',
  'from-lime-500 to-green-600',
  'from-green-500 to-emerald-600',
  'from-emerald-500 to-teal-600',
  'from-teal-500 to-cyan-600',
  'from-cyan-500 to-sky-600',
  'from-sky-500 to-blue-600',
];

const SECTION_EMOJIS = [
  '📖', '🌐', '👁️', '🚨', '🛠️', '🗺️', '⚡', '🔒',
  '📊', '🤝', '🎯', '💡', '🔧', '📋', '🏆',
];

export default function HomePage() {
  const content = getContent();
  const { sections } = content;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%236366f1%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

        <div className="relative max-w-5xl mx-auto px-6 py-20 lg:py-28">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-800
            text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8
            shadow-sm shadow-indigo-100 dark:shadow-indigo-900/20">
            <GraduationCap size={14} />
            Handbook Profesional · NOC Analyst
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]
            bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800
            dark:from-white dark:via-indigo-200 dark:to-violet-300
            bg-clip-text text-transparent">
            {content.title}
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 leading-relaxed">
            {content.description}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            {sections[0] && (
              <Link
                href={`/${sections[0].slug}`}
                className="inline-flex items-center gap-2.5
                  bg-gradient-to-r from-indigo-600 to-violet-600
                  hover:from-indigo-500 hover:to-violet-500
                  text-white px-6 py-3 rounded-xl font-semibold text-sm
                  shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30
                  transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
              >
                <BookOpen size={16} />
                Empezar a leer
                <ChevronRight size={14} />
              </Link>
            )}
            <Link
              href={`/${sections[Math.floor(sections.length / 2)]?.slug ?? sections[0]?.slug}`}
              className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400
                hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium px-2"
            >
              Ir al índice
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-12 pt-12 border-t border-slate-200 dark:border-slate-800">
            {[
              { icon: Hash, label: 'Secciones', value: String(content.totalSections) },
              { icon: Clock, label: 'Lectura estimada', value: `${Math.ceil(content.totalSections * 8)} min` },
              { icon: Users, label: 'Nivel', value: 'NOC → Senior' },
              { icon: Zap, label: 'Stack', value: 'Next.js · Vercel' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60
                  border border-indigo-100 dark:border-indigo-900/60
                  flex items-center justify-center">
                  <Icon size={15} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-600 leading-none mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Índice del contenido
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {sections.length} secciones · generadas automáticamente desde el documento
            </p>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-600">
            <BookOpen size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No se encontró contenido</p>
            <p className="text-sm mt-1">Verificá que el archivo .docx esté en la raíz del repositorio</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section, i) => (
              <Link
                key={section.id}
                href={`/${section.slug}`}
                className="group relative flex flex-col p-5 rounded-2xl
                  bg-white dark:bg-slate-900
                  border border-slate-200 dark:border-slate-800
                  hover:border-indigo-300 dark:hover:border-indigo-700
                  hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/20
                  transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Background accent */}
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-[40px] opacity-5 bg-gradient-to-br ${SECTION_GRADIENTS[i % SECTION_GRADIENTS.length]}`} />

                {/* Number + emoji */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${SECTION_GRADIENTS[i % SECTION_GRADIENTS.length]}
                    flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span className="text-xl" aria-hidden>
                    {SECTION_EMOJIS[i % SECTION_EMOJIS.length]}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug mb-2
                  group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                  {section.title}
                </h3>

                {/* Excerpt */}
                <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-2 leading-relaxed flex-1">
                  {section.excerpt}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3
                  border-t border-slate-100 dark:border-slate-800">
                  {section.subsections.length > 0 ? (
                    <span className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">
                      {section.subsections.length} subtemas
                    </span>
                  ) : (
                    <span />
                  )}
                  <ChevronRight
                    size={14}
                    className="text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
