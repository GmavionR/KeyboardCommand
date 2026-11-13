import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  Database,
  DownloadCloud,
  AlertTriangle,
  Sliders,
  Laptop,
  FolderArchive,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { formatBytes } from '../../utils/treeUtils';
import {
  isBrowserMenuAllowed,
  isDevBuild,
  setBrowserMenuAllowed,
} from '../../data/browserMenuPolicy';
import {
  AppVersion,
  StorageStats,
  loadAppVersion,
  loadJournalMode,
  loadStorageStats,
} from '../../data/systemStatus';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { themeMode, setThemeMode, systemTheme } = useTheme();
  const [allowBrowserMenu, setAllowBrowserMenu] = useState(isBrowserMenuAllowed);

  const [version, setVersion] = useState<AppVersion | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [journalMode, setJournalMode] = useState<string | null>(null);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    setStatsError(null);
    setDatabaseError(null);

    // 两项独立失败：库连不上时磁盘占用仍应如实显示，反之亦然
    const [statsResult, journalResult] = await Promise.allSettled([
      loadStorageStats(),
      loadJournalMode(),
    ]);

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value);
    } else {
      setStats(null);
      setStatsError(String(statsResult.reason));
    }

    if (journalResult.status === 'fulfilled') {
      setJournalMode(journalResult.value);
    } else {
      setJournalMode(null);
      setDatabaseError(String(journalResult.reason));
    }

    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setVersion(null);
    setVersionError(null);
    void loadAppVersion()
      .then((value) => {
        if (!cancelled) setVersion(value);
      })
      .catch((error: unknown) => {
        if (!cancelled) setVersionError(String(error));
      });

    void refreshStatus();
    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshStatus]);

  if (!isOpen) return null;

  const versionLabel = version
    ? `v${version.app}`
    : versionError
    ? '无法读取版本'
    : '正在读取…';

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
                外观颜色主题、版本信息与系统级存储状态
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

          {/* Section 2: 版本与更新 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <DownloadCloud className="w-4 h-4 text-sky-500" />
                版本与更新
              </span>
              <span
                className={`text-[11px] font-mono ${
                  versionError
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title={versionError ?? undefined}
              >
                当前版本: {versionLabel}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-200">
                    KeyboardCommand 桌面端
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {version
                      ? `基于 Tauri ${version.tauri} + Rust 原生后端`
                      : versionError
                      ? '无法读取运行时版本'
                      : '正在读取运行时版本…'}
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  title="尚未配置发行更新端点，本版本不提供在线更新检查"
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 rounded-md text-xs font-medium shrink-0 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>检查更新（不可用）</span>
                </button>
              </div>

              <div className="flex items-start space-x-2 text-amber-900 dark:text-amber-300 text-[11px] bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded border border-amber-200 dark:border-amber-800/60">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-500" />
                <span>
                  尚未配置发行更新端点，因此不提供在线更新检查与发布日志，也不会给出任何“已是最新版本”的结论。
                  更新服务端、签名与发布通道的部署不在当前版本范围内。
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: SQLite 连接状态与真实磁盘占用 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-500" />
                SQLite 数据库与存储占用
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono ${
                    databaseError
                      ? 'text-rose-600 dark:text-rose-400'
                      : journalMode
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {databaseError
                    ? '● 无法连接'
                    : journalMode
                    ? `● 已连接 (${journalMode.toUpperCase()})`
                    : '● 正在检测…'}
                </span>
                <button
                  type="button"
                  onClick={() => void refreshStatus()}
                  disabled={isRefreshing}
                  title="重新读取数据库连接状态与磁盘占用"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {databaseError && (
              <div className="flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-[11px] bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-rose-500" />
                <span className="break-all">设置数据库连接失败：{databaseError}</span>
              </div>
            )}

            {statsError && (
              <div className="flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-[11px] bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-rose-500" />
                <span className="break-all">存储占用读取失败：{statsError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">设置数据库路径</div>
                <div
                  className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate"
                  title={stats?.databasePath}
                >
                  {stats?.databasePath ?? (statsError ? '无法读取' : '正在读取…')}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <FolderArchive className="w-3 h-3" />
                  历史快照目录
                </div>
                <div
                  className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate"
                  title={stats?.historyPath}
                >
                  {stats?.historyPath ?? (statsError ? '无法读取' : '正在读取…')}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  数据库占用（含 WAL / SHM）
                </div>
                <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  {stats ? formatBytes(stats.databaseBytes) : statsError ? '无法读取' : '正在读取…'}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">历史快照占用</div>
                <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  {stats
                    ? `${formatBytes(stats.historyBytes)} · ${stats.historyCount} / ${stats.historyLimit} 条`
                    : statsError
                    ? '无法读取'
                    : '正在读取…'}
                </div>
              </div>
            </div>

            {stats && (
              <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                合计 {formatBytes(stats.databaseBytes + stats.historyBytes)}
              </div>
            )}
          </div>

          {/* Section 4: 应用内快捷键与界面行为 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-purple-500" />
                应用内快捷键与界面行为
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                仅在应用窗口获得焦点时生效
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">复制已勾选文件的上下文包</span>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  Ctrl + Shift + C
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">聚焦搜索框</span>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  Ctrl + F
                </span>
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

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              开机自启、桌面通知与系统级全局快捷键尚未接入对应的原生能力，因此这里不显示相关开关，
              以免出现勾选后不生效的假控制；接入后会在此处出现。
            </p>
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
