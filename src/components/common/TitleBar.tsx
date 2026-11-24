import React from 'react';
import { Minus, Square, X, Settings as SettingsIcon, Files, Sparkles } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useLocation, useNavigate } from '@tanstack/react-router';

interface TitleBarProps {
  onOpenSettings: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onOpenSettings }) => {
  const appWindow = getCurrentWindow();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <div data-tauri-drag-region="deep" className="h-9 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between px-3 select-none text-xs text-slate-700 dark:text-slate-300 font-sans tracking-wide transition-colors duration-150">
      {/* Left: App Logo & Navigation Tabs */}
      <div className="flex items-center space-x-2.5">
        <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white font-bold text-[10px] shadow-sm shadow-blue-500/20">
          K
        </div>
        <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1">
          键盘命令
        </span>

        {/* Feature Navigation Tabs */}
        <div data-tauri-drag-region="false" className="flex items-center space-x-1 border-l border-slate-300 dark:border-slate-700 pl-2">
          <button
            type="button"
            onClick={() => navigate({ to: '/folder-copy' })}
            className={`flex items-center gap-1.5 h-6 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              pathname === '/folder-copy'
                ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Files className="w-3 h-3" />
            <span>文件夹复制</span>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: '/prompts' })}
            className={`flex items-center gap-1.5 h-6 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              pathname === '/prompts'
                ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>提示词片段</span>
          </button>
        </div>
      </div>

      {/* Right: System Settings Entry (next to Minimize) & Windows Window Controls */}
      <div className="flex items-center space-x-1 -mr-1">
        {/* System Settings Entry Button */}
        <button
          data-tauri-drag-region="false"
          onClick={onOpenSettings}
          title="系统设置 (SQLite 状态、外观主题、过滤与大目录规则)"
          className="flex items-center space-x-1 h-7 px-2 mr-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer text-xs"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">系统设置</span>
        </button>

        {/* Windows Standard Window Action Buttons */}
        <button
          data-tauri-drag-region="false"
          title="最小化"
          onClick={() => void appWindow.minimize()}
          className="w-8 h-7 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          data-tauri-drag-region="false"
          title="最大化"
          onClick={() => void appWindow.toggleMaximize()}
          className="w-8 h-7 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          data-tauri-drag-region="false"
          title="关闭"
          onClick={() => void appWindow.close()}
          className="w-8 h-7 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-white hover:bg-red-600 rounded transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
