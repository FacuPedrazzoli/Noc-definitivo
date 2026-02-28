'use client';

import { ThemeProvider } from 'next-themes';
import { createContext, useContext, useState } from 'react';

interface MobileMenuCtx {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const MobileMenuContext = createContext<MobileMenuCtx>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export const useMobileMenu = () => useContext(MobileMenuContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <MobileMenuContext.Provider
        value={{ isOpen, toggle: () => setIsOpen((o) => !o), close: () => setIsOpen(false) }}
      >
        {children}
      </MobileMenuContext.Provider>
    </ThemeProvider>
  );
}
