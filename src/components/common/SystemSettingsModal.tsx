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
  Globe,
  CheckCircle,
  Keyboard,
  RotateCcw,
  Activity,
  FileText,
  FolderOpen,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
  MemoryStats,
  loadAppVersion,
  loadJournalMode,
  loadStorageStats,
  loadMemoryStats,
  loadIdleDestroyDelaySeconds,
  saveIdleDestroyDelaySeconds,
  loadLogDir,
  openLogDir,
} from '../../data/systemStatus';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutStatusInfo {
  shortcut: string;
  registered: boolean;
  error: string | null;
}

/** 将浏览器 e.code 映射为 global-shortcut 插件可解析的主键名 */
function mainKeyFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  const allowed = [
    'Space', 'Enter', 'NumpadEnter', 'Tab', 'Backspace', 'Delete', 'Insert',
    'Home', 'End', 'PageUp', 'PageDown',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash',
    'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'Backquote',
  ];
  if (allowed.includes(code)) return code;
  if (/^Numpad[0-9]$/.test(code)) return code;
  return null;
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
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [idleDestroyDelaySeconds, setIdleDestroyDelaySeconds] = useState<number | null>(null);
  const [idleDestroyDelayDraft, setIdleDestroyDelayDraft] = useState(isDevBuild ? '30' : '180');
  const [idleDestroyDelayError, setIdleDestroyDelayError] = useState<string | null>(null);
  const [isSavingIdleDestroyDelay, setIsSavingIdleDestroyDelay] = useState(false);
  const [logDir, setLogDir] = useState<string | null>(null);
  const [logDirError, setLogDirError] = useState<string | null>(null);
  const [shortcutStatus, setShortcutStatus] = useState<ShortcutStatusInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordHint, setRecordHint] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  const applyShortcut = useCallback(async (shortcut: string) => {
    setShortcutError(null);
    try {
      const info = await invoke<ShortcutStatusInfo>('update_palette_shortcut', { shortcut });
      setShortcutStatus(info);
    } catch (error: unknown) {
      setShortcutError(String(error));
    }
  }, []);

  const resetShortcut = useCallback(async () => {
    setShortcutError(null);
    setIsRecording(false);
    setRecordHint(null);
    try {
      const info = await invoke<ShortcutStatusInfo>('reset_palette_shortcut');
      setShortcutStatus(info);
    } catch (error: unknown) {
      setShortcutError(String(error));
    }
  }, []);

  // 热键录制：捕获阶段拦截按键，组合键成立即提交，Esc 取消
  useEffect(() => {
    if (!isRecording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setIsRecording(false);
        setRecordHint(null);
        return;
      }
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      const mods: string[] = [];
      if (e.ctrlKey) mods.push('Ctrl');
      if (e.altKey) mods.push('Alt');
      if (e.shiftKey) mods.push('Shift');
      if (e.metaKey) mods.push('Super');
      if (mods.length === 0) {
        setRecordHint('需要至少一个修饰键（Ctrl / Alt / Shift / Win）');
        return;
      }
      const main = mainKeyFromCode(e.code);
      if (!main) {
        setRecordHint('该按键不支持作为热键主键，请换一个');
        return;
      }
      setIsRecording(false);
      setRecordHint(null);
      void applyShortcut([...mods, main].join('+'));
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isRecording, applyShortcut]);

  // Esc 关闭弹窗（录制热键时 Esc 优先取消录制，已 preventDefault）
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !e.isComposing) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // 其他窗口修改热键时同步状态
  useEffect(() => {
    if (!isOpen) return;
    let unlisten: (() => void) | undefined;
    void listen<ShortcutStatusInfo>('palette-shortcut-changed', ({ payload }) => {
      setShortcutStatus(payload);
    })
      .then((fn) => { unlisten = fn; })
      .catch(() => {});
    return () => { unlisten?.(); };
  }, [isOpen]);

  // 关闭弹窗时退出录制态
  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setRecordHint(null);
    }
  }, [isOpen]);

  const handleOpenLogDir = useCallback(async () => {
    try {
      await openLogDir();
    } catch (err) {
      setLogDirError(String(err));
    }
  }, []);

  const handleSaveIdleDestroyDelay = useCallback(async () => {
    setIdleDestroyDelayError(null);
    setIsSavingIdleDestroyDelay(true);
    try {
      const seconds = await saveIdleDestroyDelaySeconds(Number(idleDestroyDelayDraft));
      setIdleDestroyDelaySeconds(seconds);
      setIdleDestroyDelayDraft(String(seconds));
    } catch (error) {
      setIdleDestroyDelayError(String(error));
    } finally {
      setIsSavingIdleDestroyDelay(false);
    }
  }, [idleDestroyDelayDraft]);

  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    setStatsError(null);
    setDatabaseError(null);
    setMemoryError(null);
    setLogDirError(null);

    // 各项独立失败：库连不上时磁盘占用与内存仍应如实显示，反之亦然
    const [statsResult, journalResult, memoryResult, logDirResult, idleDelayResult] = await Promise.allSettled([
      loadStorageStats(),
      loadJournalMode(),
      loadMemoryStats(),
      loadLogDir(),
      loadIdleDestroyDelaySeconds(),
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

    if (memoryResult.status === 'fulfilled') {
      setMemoryStats(memoryResult.value);
    } else {
      setMemoryStats(null);
      setMemoryError(String(memoryResult.reason));
    }

    if (logDirResult.status === 'fulfilled') {
      setLogDir(logDirResult.value);
    } else {
      setLogDir(null);
      setLogDirError(String(logDirResult.reason));
    }

    const loadedIdleDelay = idleDelayResult.status === 'fulfilled' ? idleDelayResult.value : null;
    setIdleDestroyDelaySeconds(loadedIdleDelay);
    if (loadedIdleDelay !== null) setIdleDestroyDelayDraft(String(loadedIdleDelay));

    setIsRefreshing(false);
  }, []);

  // 内存占用定时采样：只在设置弹窗打开时运行，关闭后定时器自动清除，保持零额外 CPU 开销
  useEffect(() => {
    if (!isOpen) {
      setMemoryStats(null);
      return;
    }

    let isMounted = true;
    const fetchMemory = async () => {
      try {
        const data = await loadMemoryStats();
        if (isMounted) {
          setMemoryStats(data);
          setMemoryError(null);
        }
      } catch (e) {
        if (isMounted) setMemoryError(String(e));
      }
    };

    // 弹窗打开时立即读一次，之后每 5 秒自动采样一次
    void fetchMemory();
    const timer = setInterval(() => {
      void fetchMemory();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isOpen]);

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
    void invoke<ShortcutStatusInfo>('get_shortcut_status')
      .then((value) => {
        if (!cancelled) setShortcutStatus(value);
      })
      .catch(() => {
        if (!cancelled)
          setShortcutStatus({ shortcut: 'Ctrl+Shift+K', registered: false, error: '无法读取快捷键状态' });
      });
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
                系统设置（键盘命令全局配置）
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
                    键盘命令桌面端
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

              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1 col-span-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-cyan-500" />
                    运行与生命周期日志目录
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleOpenLogDir()}
                    title="在系统文件资源管理器中打开日志目录"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer"
                  >
                    <FolderOpen className="w-3 h-3" />
                    打开日志目录
                  </button>
                </div>
                <div
                  className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate"
                  title={logDir ?? (logDirError ? logDirError : undefined)}
                >
                  {logDir ?? (logDirError ? `无法读取：${logDirError}` : '正在读取…')}
                </div>
              </div>
            </div>

            {stats && (
              <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                合计 {formatBytes(stats.databaseBytes + stats.historyBytes)}
              </div>
            )}
          </div>

          {/* Section: 运行时内存占用与轻量化监控 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-500" />
                运行时内存占用 (40MB 轻量化预算)
              </span>
              <div className="flex items-center gap-2">
                {memoryStats ? (
                  <span
                    className={`text-[11px] font-mono ${
                      memoryStats.totalBytes <= 40 * 1024 * 1024
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {memoryStats.totalBytes <= 40 * 1024 * 1024
                      ? '● 极轻量达标 (≤40MB)'
                      : '▲ 稍高于预期'}
                  </span>
                ) : memoryError ? (
                  <span className="text-[11px] font-mono text-rose-500">● 无法读取</span>
                ) : (
                  <span className="text-[11px] font-mono text-slate-400">● 正在采样…</span>
                )}
              </div>
            </div>

            {memoryError && (
              <div className="flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-[11px] bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-rose-500" />
                <span className="break-all">内存占用读取失败：{memoryError}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">应用总物理内存</div>
                <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {memoryStats ? formatBytes(memoryStats.totalBytes) : memoryError ? '无法读取' : '正在计算…'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                  主进程 + {memoryStats ? Math.max(0, memoryStats.processCount - 1) : 0} 个子进程
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Rust 宿主主进程</div>
                <div className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                  {memoryStats ? formatBytes(memoryStats.mainProcessBytes) : memoryError ? '无法读取' : '正在计算…'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                  Win32 窗口与后端运行时
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">WebView2 渲染工作集</div>
                <div className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                  {memoryStats ? formatBytes(memoryStats.childProcessesBytes) : memoryError ? '无法读取' : '正在计算…'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                  {memoryStats ? `${Math.max(0, memoryStats.processCount - 1)} 个独立渲染进程` : '加载中…'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs shadow-emerald-500/50" />
              <span>
                <strong>后台空闲优化已启用：</strong>主窗口隐藏闲置
                {idleDestroyDelaySeconds === null
                  ? '一段时间'
                  : idleDestroyDelaySeconds >= 60
                    ? ` ${Math.floor(idleDestroyDelaySeconds / 60)} 分钟（${idleDestroyDelaySeconds} 秒）`
                    : ` ${idleDestroyDelaySeconds} 秒`}
                后将自动销毁 WebView 渲染进程释放内存；点击托盘图标或全局快捷键时按需重建恢复。
              </span>
            </div>

            <div className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <label className="flex-1 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <span>主窗口隐藏后销毁 WebView 的等待时间（秒）</span>
                <input
                  type="number"
                  min={30}
                  max={3600}
                  step={30}
                  value={idleDestroyDelayDraft}
                  disabled={isDevBuild || isSavingIdleDestroyDelay}
                  onChange={(event) => setIdleDestroyDelayDraft(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleSaveIdleDestroyDelay()}
                disabled={isDevBuild || isSavingIdleDestroyDelay || Number(idleDestroyDelayDraft) === idleDestroyDelaySeconds}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingIdleDestroyDelay ? '保存中…' : '保存'}
              </button>
            </div>
            {isDevBuild && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                开发模式固定为 30 秒；正式版本可设置 30–3600 秒，并保存到系统配置。
              </div>
            )}
            {!isDevBuild && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                正式版本支持设置 30–3600 秒；默认 180 秒。保存后立即用于后续后台倒计时。
              </div>
            )}
            {idleDestroyDelayError && (
              <div className="text-[11px] text-red-600 dark:text-red-400">保存失败：{idleDestroyDelayError}</div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-0.5">
              <span>仅在打开本设置页面时采样（每 5 秒刷新），关闭后定时器自动清除，0 额外 CPU 开销</span>
              {memoryStats && (
                <span className="font-mono text-[10px]">采样时间: {memoryStats.timestamp}</span>
              )}
            </div>
          </div>

          {/* Section 4: 系统级全局快捷键 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-500" />
                系统级全局快捷键
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                后台及失焦时均可唤起
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2.5">
              {/* 命令面板热键行 */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-slate-700 dark:text-slate-300">命令面板唤起 / 收起</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    全局有效（后台及失焦时均可唤起）
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isRecording ? (
                    <>
                      <span className="px-2 py-1 rounded border border-dashed border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40 font-mono text-[11px] text-blue-600 dark:text-blue-300 animate-pulse">
                        按下新组合键…
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecording(false);
                          setRecordHint(null);
                        }}
                        className="px-2 py-1 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        {(shortcutStatus?.shortcut ?? 'Ctrl+Shift+K').split('+').join(' + ')}
                      </span>
                      {shortcutStatus ? (
                        shortcutStatus.registered ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400">检测中…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecording(true);
                          setRecordHint(null);
                          setShortcutError(null);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                      >
                        <Keyboard className="w-3 h-3" />
                        修改
                      </button>
                      <button
                        type="button"
                        onClick={() => void resetShortcut()}
                        title="恢复默认 Ctrl+Shift+K"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* 录制提示 */}
              {isRecording && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {recordHint ?? '同时按下修饰键与主键（如 Ctrl + Alt + P）；按 Esc 取消录制。'}
                </div>
              )}
              {/* 修改失败提示 */}
              {shortcutError && (
                <div className="flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-[11px] bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded border border-rose-200 dark:border-rose-800/60">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-rose-500" />
                  <span>{shortcutError}</span>
                </div>
              )}
              {/* 冲突错误提示 */}
              {shortcutStatus && !shortcutStatus.registered && (
                <div className="flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-[11px] bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded border border-rose-200 dark:border-rose-800/60">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-rose-500" />
                  <span>
                    {shortcutStatus.error
                      ? `该快捷键已被系统或其他应用占用，请更换。（详情：${shortcutStatus.error}）`
                      : '该快捷键未能注册，请检查是否被其他应用占用。'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: 应用内快捷键与界面行为 */}
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
              开机自启与桌面通知尚未接入对应的原生能力，因此这里不显示相关开关，
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
