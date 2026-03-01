import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReadingProgress from '@/components/ReadingProgress';
import LayoutShell from '@/components/LayoutShell';
import { getContent, getAllSectionsMeta } from '@/lib/content';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export async function generateMetadata(): Promise<Metadata> {
  const content = getContent();
  return {
    title: { default: content.title, template: `%s · ${content.title}` },
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      type: 'website',
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = getContent();
  const sections = getAllSectionsMeta();

  return (
    <html lang="es" suppressHydrationWarning className={inter.variable}>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <Providers>
          <ReadingProgress />
          <Header sections={sections} />
          <div className="flex min-h-screen pt-[59px]">
            <Sidebar sections={sections} totalSections={content.totalSections} />
            <LayoutShell>
              {children}
            </LayoutShell>
          </div>
        </Providers>
      </body>
    </html>
  );
}
