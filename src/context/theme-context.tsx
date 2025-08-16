
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';
type Font = 'inter' | 'roboto' | 'lora';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  font: Font;
  setFont: (font: Font) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [font, setFontState] = useState<Font>('inter');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('app-theme') as Theme | null;
    const storedFont = localStorage.getItem('app-font') as Font | null;
    
    // Set theme from localStorage or default
    if (storedTheme) {
      setThemeState(storedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }
    
    // Set font from localStorage or default
    if (storedFont) {
        setFontState(storedFont);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      localStorage.setItem('app-theme', theme);
    }
  }, [theme, isMounted]);
  
   useEffect(() => {
    if (isMounted) {
      document.body.classList.remove('font-inter', 'font-roboto', 'font-lora');
      document.body.classList.add(`font-${font}`);
      localStorage.setItem('app-font', font);
    }
  }, [font, isMounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme !== theme) {
      setThemeState(newTheme);
    }
  }, [theme]);

  const setFont = useCallback((newFont: Font) => {
    if (newFont !== font) {
        setFontState(newFont);
    }
  }, [font]);
  
  const value = { theme, setTheme, font, setFont };

  if (!isMounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
