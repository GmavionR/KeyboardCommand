import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { emit, listen } from '@tauri-apps/api/event';

export type ThemeMode = 'system' | 'light' | 'dark';

/** 跨 Webview 广播的事件名 */
const THEME_EVENT = 'kbc://theme-changed';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  systemTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 从 localStorage 读取持久化主题，默认跟随系统
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('kbc_theme_mode');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  // 监听系统颜色方案变化
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    updateSystemTheme(mediaQuery);
    const listener = (e: MediaQueryListEvent) => updateSystemTheme(e);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const isDark = themeMode === 'system' ? systemTheme === 'dark' : themeMode === 'dark';

  // 应用 .dark 类与 colorScheme 到 <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDark]);

  // 跨 Webview 接收其他窗口广播的主题变更
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<ThemeMode>(THEME_EVENT, ({ payload }) => {
      // 只更新状态和 localStorage，不再 emit，避免循环广播
      setThemeModeState(payload);
      localStorage.setItem('kbc_theme_mode', payload);
    })
      .then((fn) => { unlisten = fn; })
      .catch(() => { /* Tauri 未准备好时静默忽略（非 Tauri 环境 / 测试） */ });
    return () => { unlisten?.(); };
  }, []);

  /** 设置主题：持久化 + 本地更新 + 跨 Webview 广播 */
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('kbc_theme_mode', mode);
    // 广播给其他 Webview（主窗口 ↔ 命令面板双向同步）
    void emit(THEME_EVENT, mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark, systemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
