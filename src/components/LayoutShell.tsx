'use client';

import { useSidebar, useReadingMode } from './Providers';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const { active } = useReadingMode();

  return (
    <main
      className={`flex-1 min-w-0 transition-[margin] duration-300 ease-in-out ${
        active ? 'lg:ml-0' : collapsed ? 'lg:ml-16' : 'lg:ml-72'
      }`}
    >
      {children}
    </main>
  );
}
