import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Folder,
  AlertTriangle,
  CheckSquare,
  Square,
  CornerDownLeft,
  X,
  Loader2,
  Info,
  XCircle,
  RefreshCw,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { SearchMatch, SettingsConfig } from '../../types';
import { searchPaths } from '../../data/searchBackend';

const DEBOUNCE_MS = 500;
const FD_INSTALL_COMMAND = 'winget install sharkdp.fd';

interface SearchBarProps {
  rootPath: string;
  settings: SettingsConfig;
  selectedPaths: Set<string>;
  isFdAvailable: boolean;
  onRecheckFd: () => void;
  onToggleFileSelect: (path: string, size?: number) => void;
  onLocateNodeInTree: (path: string, isFolder: boolean) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  rootPath,
  settings,
  selectedPaths,
  isFdAvailable,
  onRecheckFd,
  onToggleFileSelect,
  onLocateNodeInTree,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [incompleteWarning, setIncompleteWarning] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // 后端只在 debug 构建下发 command，release 构建恒为 undefined，面板自然不渲染
  const [fdCommand, setFdCommand] = useState<string | null>(null);
  const [commandCopied, setCommandCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 迟到的旧查询不得覆盖新查询的结果
  const requestVersion = useRef(0);

  const runSearch = useCallback(
    async (query: string) => {
      const version = ++requestVersion.current;
      try {
        const outcome = await searchPaths(rootPath, query, settings);
        if (version !== requestVersion.current) return;
        setResults(outcome.results);
        setHasMore(outcome.hasMore);
        setIsIncomplete(outcome.incomplete);
        setIncompleteWarning(outcome.warning);
        setFdCommand(outcome.command ?? null);
        setCommandCopied(false);
        setSearchError(null);
        setHighlightedIndex(0);
        setHasSearched(true);
        setIsDropdownOpen(true);
      } catch (error) {
        if (version !== requestVersion.current) return;
        setResults([]);
        setHasMore(false);
        setIsIncomplete(false);
        setIncompleteWarning(null);
        setFdCommand(null);
        setSearchError(String(error));
        setHasSearched(true);
        setIsDropdownOpen(true);
      } finally {
        if (version === requestVersion.current) setIsSearching(false);
      }
    },
    [rootPath, settings]
  );

  // Global Ctrl+F listener to quickly focus SearchBar
  useEffect(() => {
    const handleGlobalSearchKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalSearchKey);
    return () => window.removeEventListener('keydown', handleGlobalSearchKey);
  }, []);

  useEffect(() => {
    const query = inputValue.trim();
    if (!query || !rootPath || !isFdAvailable) {
      requestVersion.current += 1;
      setResults([]);
      setHasMore(false);
      setIsIncomplete(false);
      setIncompleteWarning(null);
      setFdCommand(null);
      setSearchError(null);
      setHasSearched(false);
      setIsSearching(false);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => void runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputValue, rootPath, isFdAvailable, runSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      return;
    }
    if (!isDropdownOpen || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) setIsDropdownOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[highlightedIndex];
      if (item) executeItem(item);
    }
  };

  const executeItem = (item: SearchMatch) => {
    if (item.type === 'file') {
      onToggleFileSelect(item.relativePath, item.size);
      onLocateNodeInTree(item.relativePath, false);
    } else {
      // 目录只定位，不切换文件夹选择状态
      onLocateNodeInTree(item.relativePath, true);
    }
    // 处理后保持列表开启，支持连续操作
    setIsDropdownOpen(true);
  };

  const handleCopyCommand = async () => {
    if (!fdCommand) return;
    try {
      await writeText(fdCommand);
      setCommandCopied(true);
      setTimeout(() => setCommandCopied(false), 2000);
    } catch {
      setCommandCopied(false);
    }
  };

  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const q = query.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <mark className="bg-amber-200 dark:bg-amber-500/40 text-slate-900 dark:text-amber-200 rounded-xs px-0.5 font-semibold">
          {match}
        </mark>
        {after}
      </>
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Search Bar Input Row */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : !isFdAvailable ? (
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-slate-400" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            disabled={!isFdAvailable || !rootPath}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              if (inputValue.trim() && hasSearched) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              !isFdAvailable
                ? `fd 不可用：搜索已停用（安装后重试：${FD_INSTALL_COMMAND}）`
                : !rootPath
                ? '请先选择要搜索的文件夹'
                : '搜索文件名或文件夹名 (Ctrl+F 快速聚焦，500ms 自动搜索)'
            }
            className={`w-full pl-9 pr-28 py-2 bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none transition-all shadow-2xs ${
              !isFdAvailable
                ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 cursor-not-allowed placeholder-rose-400 dark:placeholder-rose-500/70'
                : isIncomplete
                ? 'border-amber-400 dark:border-amber-500/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-400'
                : 'border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
          />

          {/* Quick Clear or Keyboard Hints / fd status badge inside search input */}
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center space-x-1.5">
            {!isFdAvailable ? (
              <button
                type="button"
                onClick={onRecheckFd}
                className="flex items-center space-x-1 px-2 py-0.5 text-[11px] bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800/80 font-medium hover:bg-rose-200 dark:hover:bg-rose-900/80 transition-colors cursor-pointer"
                title={`应用从系统 PATH 查找 fd，未找到时停用搜索，不回退到其他后端。安装命令：${FD_INSTALL_COMMAND}。安装完成后点击重新检测。`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                <span>fd 不可用</span>
                <RefreshCw className="w-3 h-3 shrink-0" />
                <span>重新检测</span>
              </button>
            ) : (
              <>
                {inputValue && (
                  <button
                    onClick={() => {
                      setInputValue('');
                      inputRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                    title="清空搜索"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {isIncomplete && (
                  <span
                    className="flex items-center space-x-1 px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800/80 font-mono"
                    title={incompleteWarning ?? '部分路径无法访问'}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>搜索不完整</span>
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center space-x-1 px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700 font-mono">
                  <span>Ctrl+F</span>
                </span>
                <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700 font-mono">
                  ↑↓选择 ↵确认
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown Results List */}
      {isDropdownOpen && isFdAvailable && hasSearched && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {/* Header row in dropdown */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <Search className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              匹配名称结果（{results.length} 条）
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              文件回车切换勾选，目录回车仅定位 (保持下拉开启)
            </span>
          </div>

          {/* 开发模式命令面板：release 构建后端不下发 command，此块不渲染 */}
          {fdCommand && (
            <div className="px-3 py-2 bg-slate-900 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  本次执行的 fd 命令
                  <span className="px-1 py-px rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[9px] font-bold tracking-normal">
                    仅开发模式
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition-colors cursor-pointer ${
                    commandCopied
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-slate-100'
                  }`}
                  title="复制完整命令，可直接粘贴到终端复现本次搜索"
                >
                  {commandCopied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{commandCopied ? '已复制' : '复制'}</span>
                </button>
              </div>
              <div className="fd-command-scroll max-h-28 overflow-auto rounded-md bg-slate-950 border border-slate-700/60 px-2.5 py-2">
                <code className="block font-mono text-[11px] leading-relaxed text-emerald-300 whitespace-pre-wrap break-all select-text">
                  {fdCommand}
                </code>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                已保留 fd 原生 .gitignore 过滤；只匹配文件/目录自身名称，目录规则经 --exclude 剪枝，文件规则由应用后筛选。
              </p>
            </div>
          )}

          {/* Results list */}
          <div className="max-h-72 overflow-y-auto">
            {results.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                {searchError ? (
                  <div className="flex flex-col items-center justify-center space-y-1 px-4 text-rose-700 dark:text-rose-300">
                    <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                    <span className="font-medium">搜索失败</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 break-all">
                      {searchError}
                    </span>
                  </div>
                ) : isIncomplete ? (
                  <div className="flex flex-col items-center justify-center space-y-1 px-4 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    <span className="font-medium">搜索不完整，未能读取到匹配结果</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 break-all">
                      {incompleteWarning ?? 'fd 遍历报告受限'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Info className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">没有搜索到</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      只比对文件/文件夹自身的名称，请检查拼写、扩展名或确认是否已被排除规则忽略
                    </span>
                  </div>
                )}
              </div>
            ) : (
              results.map((item, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = item.type === 'file' && selectedPaths.has(item.relativePath);

                return (
                  <div
                    key={item.relativePath}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => executeItem(item)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-blue-50 dark:bg-blue-600/20 text-slate-900 dark:text-white border-l-2 border-blue-600 dark:border-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      {item.type === 'file' ? (
                        <div className="shrink-0 text-slate-400">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                      ) : (
                        <div className="shrink-0 text-amber-500 dark:text-amber-400">
                          <Folder className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {renderHighlightedText(item.name, inputValue)}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              item.type === 'file'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                            }`}
                          >
                            {item.type === 'file' ? '文件' : '目录'}
                          </span>
                          {item.type === 'file' && isSelected && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1 rounded font-medium">
                              已勾选
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.relativePath.slice(0, item.relativePath.length - item.name.length)}
                          {renderHighlightedText(item.name, inputValue)}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500 flex items-center space-x-1 pl-3">
                      <span>{item.type === 'file' ? '切换并定位' : '定位目录'}</span>
                      <CornerDownLeft className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {isIncomplete && results.length > 0 && (
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="font-medium">搜索不完整，已保留可访问路径的结果</span>
            </div>
          )}

          {hasMore && (
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="font-medium">结果过多，请输入更准确的名称</span>
              </div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400/80">
                已按路径升序显示前 10 条
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
