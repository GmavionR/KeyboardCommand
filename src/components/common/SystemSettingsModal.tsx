import React, { useEffect, useState } from 'react';
import { appConfigDir, join } from '@tauri-apps/api/path';
import {
  X,
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  Database,
  DownloadCloud,
  CheckCircle2,
  Sliders,
  Laptop,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { DATABASE_FILE_NAME } from '../../data/settingsDatabase';
import {
  isBrowserMenuAllowed,
  isDevBuild,
  setBrowserMenuAllowed,
} from '../../data/browserMenuPolicy';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { themeMode, setThemeMode, systemTheme } = useTheme();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'latest' | 'available'>('idle');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [desktopNotification, setDesktopNotification] = useState(true);
  const [allowBrowserMenu, setAllowBrowserMenu] = useState(isBrowserMenuAllowed);
  const [databasePath, setDatabasePath] = useState<string | null>(null);
  const [databasePathError, setDatabasePathError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setDatabasePath(null);
    setDatabasePathError(null);

    void appConfigDir()
      .then((configDirectory) => join(configDirectory, DATABASE_FILE_NAME))
      .then((path) => {
        if (!cancelled) setDatabasePath(path);
      })
      .catch((error: unknown) => {
        if (!cancelled) setDatabasePathError(String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    setUpdateStatus('idle');
    setTimeout(() => {
      setIsCheckingUpdate(false);
      setUpdateStatus('latest');
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                系统设置 (KeyboardCommand 全局配置)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                外观颜色主题、软件更新与系统级存储配置
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Section 1: 外观主题色 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-500" />
                外观颜色主题
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                当前系统偏好: {systemTheme === 'dark' ? '深色' : '浅色'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setThemeMode('system')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-lg border text-center transition-all cursor-pointer ${
                  themeMode === 'system'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Monitor className="w-5 h-5 mb-1.5 text-blue-500" />
                <span className="text-xs">跟随系统</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">默认实时联动</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-lg border text-center transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-5 h-5 mb-1.5 text-amber-500" />
                <span className="text-xs">浅色模式</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">明亮高对比度</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-lg border text-center transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-5 h-5 mb-1.5 text-indigo-400" />
                <span className="text-xs">深色模式</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">沉浸低蓝光</span>
              </button>
            </div>
          </div>

          {/* Section 2: 软件更新与版本 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <DownloadCloud className="w-4 h-4 text-sky-500" />
                软件更新与版本
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                当前版本: v1.2.4 (x64 Release)
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200">
                    KeyboardCommand Desktop Engine
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    基于 Electron 32 + Node.js 22 本地高性能多线程架构
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  disabled={isCheckingUpdate}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white rounded-md text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? '正在检查...' : '检查更新'}</span>
                </button>
              </div>

              {updateStatus === 'latest' && (
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200 dark:border-emerald-800/60">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>已是最新版本 (v1.2.4)，无需更新。发布通道: Stable Channel</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoUpdate}
                    onChange={(e) => setAutoUpdate(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                  />
                  <span>发现新版本时在后台自动下载并在退出时安装</span>
                </label>
                <span className="text-[10px] text-slate-400">每天自动检查一次</span>
              </div>
            </div>
          </div>

          {/* Section 3: SQLite 全局数据库存储与状态 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-500" />
                SQLite 全局数据库状态
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                ● 已连接 (WAL Mode)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">数据库存储路径</div>
                <div
                  className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate"
                  title={databasePathError ?? databasePath ?? undefined}
                >
                  {databasePath ?? (databasePathError ? '无法获取应用配置目录' : '正在获取…')}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">数据与缓存占用</div>
                <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  2.4 MB (历史快照 20 条已保留)
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: 系统行为与快捷键 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-purple-500" />
                系统级行为与全局快捷键
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">复制上下文包全局快捷键</span>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  Ctrl + Shift + C
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={launchAtStartup}
                    onChange={(e) => setLaunchAtStartup(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                  />
                  <span>Windows 开机时在后台托盘自启动</span>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={desktopNotification}
                    onChange={(e) => setDesktopNotification(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                  />
                  <span>复制成功或失败时显示 Windows 原生桌面系统通知</span>
                </label>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={allowBrowserMenu}
                    onChange={(e) => {
                      setAllowBrowserMenu(e.target.checked);
                      setBrowserMenuAllowed(e.target.checked);
                    }}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                  />
                  <span>允许 WebView 右键菜单（发布版排查界面问题时开启，重启后仍生效）</span>
                </label>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {isDevBuild ? '当前为开发版，默认允许' : '当前为发布版，默认屏蔽'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium cursor-pointer transition-colors shadow-xs"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
