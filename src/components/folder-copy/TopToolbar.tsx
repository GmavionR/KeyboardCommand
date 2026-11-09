import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  ChevronDown,
  Copy,
  Check,
  Folder,
  RefreshCw,
  CornerDownLeft,
  RotateCcw,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

interface TopToolbarProps {
  currentPath: string;
  onChangePath: (path: string) => void;
  onRefreshFolder: (path: string) => void;
  onOpenPageSettings: () => void;
  recentFolders: string[];
  onSelectRecentFolder: (path: string) => void;
  onOpenFolderDialog: () => void;
  isLoadingFolder?: boolean;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  currentPath,
  onChangePath,
  onRefreshFolder,
  onOpenPageSettings,
  recentFolders,
  onSelectRecentFolder,
  onOpenFolderDialog,
  isLoadingFolder = false,
}) => {
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [inputPath, setInputPath] = useState(currentPath);
  const [isFocused, setIsFocused] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize when currentPath updates externally
  useEffect(() => {
    setInputPath(currentPath);
  }, [currentPath]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsRecentOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentPath) return;
    try {
      await navigator.clipboard.writeText(currentPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch {
      setCopiedPath(false);
    }
  };

  const handleSubmitPath = () => {
    const trimmed = inputPath.trim();
    if (!trimmed) {
      setInputPath(currentPath);
      return;
    }
    onChangePath(trimmed);
    inputRef.current?.blur();
  };

  const handleRefreshClick = () => {
    const targetPath = inputPath.trim() || currentPath;
    onRefreshFolder(targetPath);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmitPath();
    } else if (e.key === 'Escape') {
      setInputPath(currentPath);
      inputRef.current?.blur();
      setIsRecentOpen(false);
    } else if (e.key === 'ArrowDown' && !isRecentOpen) {
      e.preventDefault();
      setIsRecentOpen(true);
    }
  };

  const isDirty = inputPath !== currentPath;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center space-x-2.5 shadow-xs transition-colors duration-150">
      {/* 1. Left (flex-1): Full-Width Address Combobox (手写输入/直接编辑/粘贴 + 历史下拉) */}
      <div className="flex-1 flex items-center min-w-0" ref={comboboxRef}>
        <div
          className={`relative w-full flex items-center bg-slate-50 dark:bg-slate-950 border rounded-lg transition-all duration-150 shadow-2xs ${
            isFocused || isDirty || isRecentOpen
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900'
              : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
          }`}
        >
          {/* Leading Directory Icon & Label */}
          <div className="pl-3 pr-1.5 flex items-center text-slate-400 dark:text-slate-500 text-xs shrink-0 select-none">
            <Folder className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="hidden md:inline text-[11px] ml-1.5 font-sans text-slate-400 dark:text-slate-500">
              根目录:
            </span>
          </div>

          {/* Editable Path Input (手写/直接输入与粘贴) */}
          <input
            ref={inputRef}
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="输入或下拉选择文件夹完整路径 (按 Enter 加载)..."
            title="当前根目录路径（支持直接键盘输入/修改，按 Enter 键加载；点击右侧箭头选择最近文件夹）"
            className="flex-1 bg-transparent px-2 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-hidden selection:bg-blue-600 selection:text-white min-w-0"
          />

          {/* If path is modified from currentPath: Show Revert and Load buttons */}
          {isDirty ? (
            <div className="flex items-center space-x-1 shrink-0 px-1">
              <button
                type="button"
                onClick={() => setInputPath(currentPath)}
                className="p-1 hover:text-slate-700 dark:hover:text-slate-200 text-slate-400 rounded transition-colors cursor-pointer"
                title="还原当前路径 (Esc)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={handleSubmitPath}
                className="flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-sans font-medium transition-colors cursor-pointer shadow-2xs"
                title="加载该路径 (Enter)"
              >
                <CornerDownLeft className="w-3 h-3" />
                <span>载入</span>
              </button>
            </div>
          ) : (
            /* Quick Copy Current Path button */
            <button
              type="button"
              onClick={handleCopyPath}
              className="p-1.5 hover:text-slate-900 dark:hover:text-white text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded shrink-0 transition-colors cursor-pointer mr-0.5"
              title="复制当前完整路径到剪贴板"
            >
              {copiedPath ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Trailing Dropdown Toggle Button (下拉展开最近历史文件夹列表) */}
          <button
            type="button"
            onClick={() => setIsRecentOpen(!isRecentOpen)}
            className={`px-2.5 py-2 border-l border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-r-lg transition-colors cursor-pointer shrink-0 ${
              isRecentOpen ? 'bg-slate-200/80 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : ''
            }`}
            title="下拉选择最近使用过的文件夹并恢复历史勾选"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isRecentOpen ? 'rotate-180 text-blue-500' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu: Recent Folders */}
          {isRecentOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl dark:shadow-black/60 z-50 overflow-hidden text-xs animate-in fade-in-50 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>最近使用过的文件夹</span>
                </span>
                <span>选择后自动载入并恢复该目录历史勾选</span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 py-1">
                {recentFolders.length === 0 ? (
                  <div className="px-3 py-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    暂无最近使用的文件夹
                  </div>
                ) : recentFolders.map((path) => {
                  const isCurrent = path === currentPath;
                  return (
                    <button
                      key={path}
                      type="button"
                      onClick={() => {
                        onSelectRecentFolder(path);
                        setIsRecentOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-start space-x-2.5 transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Folder
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isCurrent
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-amber-500 dark:text-amber-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[11px] truncate font-medium">
                          {path}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {isCurrent ? '● 当前正在浏览中' : '点击载入此根目录并同步历史选择'}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono shrink-0">
                          当前
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Right (shrink-0): Action Buttons on the Right Side of the Input Box */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* 选择文件夹 (Windows Folder Dialog) */}
        <button
          type="button"
          onClick={onOpenFolderDialog}
          disabled={isLoadingFolder}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white rounded-lg text-xs font-medium shadow-xs shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
          title="打开 Windows 文件夹选择对话框"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>选择文件夹</span>
        </button>

        {/* 重新载入 (Refresh / Load) */}
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={isLoadingFolder}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 active:bg-slate-300 dark:active:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
          title="重新载入输入框中指定的当前文件夹 (Refresh / Load)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFolder ? 'animate-spin text-blue-500' : ''}`} />
          <span className="hidden sm:inline">重新载入</span>
        </button>

        {/* 当前页面规则设置 (Page-specific rules: Whitelist, Exclusions, Ignored Dirs, Threshold) */}
        <button
          type="button"
          onClick={onOpenPageSettings}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          title="设置当前页面的文件过滤白名单、排除规则、忽略目录和大目录阈值"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">规则设置</span>
        </button>
      </div>
    </div>
  );
};
