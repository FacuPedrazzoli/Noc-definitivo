'use client';

import { ThemeProvider } from 'next-themes';
import { createContext, useContext, useState, useEffect } from 'react';

// ── Mobile menu ────────────────────────────────────────────────────────────
interface MobileMenuCtx { isOpen: boolean; toggle: () => void; close: () => void; }
const MobileMenuContext = createContext<MobileMenuCtx>({ isOpen: false, toggle: () => {}, close: () => {} });
export const useMobileMenu = () => useContext(MobileMenuContext);

// ── Sidebar collapse ───────────────────────────────────────────────────────
interface SidebarCtx { collapsed: boolean; toggle: () => void; }
const SidebarContext = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} });
export const useSidebar = () => useContext(SidebarContext);

// ── Reading mode ───────────────────────────────────────────────────────────
interface ReadingModeCtx { active: boolean; toggle: () => void; }
const ReadingModeContext = createContext<ReadingModeCtx>({ active: false, toggle: () => {} });
export const useReadingMode = () => useContext(ReadingModeContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  const toggleSidebar = () => setCollapsed(v => {
    const next = !v;
    localStorage.setItem('sidebar-collapsed', String(next));
    return next;
  });

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <SidebarContext.Provider value={{ collapsed, toggle: toggleSidebar }}>
        <ReadingModeContext.Provider value={{ active: reading, toggle: () => setReading(v => !v) }}>
          <MobileMenuContext.Provider value={{ isOpen: mobileOpen, toggle: () => setMobileOpen(o => !o), close: () => setMobileOpen(false) }}>
            {children}
          </MobileMenuContext.Provider>
        </ReadingModeContext.Provider>
      </SidebarContext.Provider>
    </ThemeProvider>
  );
}
