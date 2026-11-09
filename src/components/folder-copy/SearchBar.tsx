import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { SearchResultItem, FileNode, SettingsConfig } from '../../types';
import { searchNodes } from '../../utils/treeUtils';

interface SearchBarProps {
  rootNode: FileNode;
  settings: SettingsConfig;
  selectedPaths: Set<string>;
  onToggleFileSelect: (path: string) => void;
  onLocateNodeInTree: (path: string, isFolder: boolean) => void;
  // State simulation props
  isFdAvailable?: boolean;
  isSearchIncomplete?: boolean;
  forcedQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  rootNode,
  settings,
  selectedPaths,
  onToggleFileSelect,
  onLocateNodeInTree,
  isFdAvailable = true,
  isSearchIncomplete = false,
  forcedQuery,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalMatchesCount, setTotalMatchesCount] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Sync forced query when switching design state presets
  useEffect(() => {
    if (forcedQuery !== undefined) {
      setInputValue(forcedQuery);
      if (forcedQuery) {
        setIsSearching(true);
        setTimeout(() => {
          runSearch(forcedQuery);
          setIsSearching(false);
        }, 150);
      } else {
        setResults([]);
        setHasSearched(false);
        setIsDropdownOpen(false);
      }
    }
  }, [forcedQuery]);

  // 500ms debounce
  useEffect(() => {
    if (forcedQuery !== undefined && inputValue === forcedQuery) return;

    if (!inputValue.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      runSearch(inputValue);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, rootNode, settings, selectedPaths]);

  const runSearch = (q: string) => {
    if (!isFdAvailable) {
      setResults([]);
      setHasSearched(true);
      setIsDropdownOpen(true);
      return;
    }

    const allMatches = searchNodes(rootNode, q, settings, selectedPaths);
    setTotalMatchesCount(allMatches.length);
    // Display maximum 10 items
    setResults(allMatches.slice(0, 10));
    setHasSearched(true);
    setIsDropdownOpen(true);
    setHighlightedIndex(0);
  };

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
    if (!isDropdownOpen || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsDropdownOpen(true);
      }
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
      if (results[highlightedIndex]) {
        executeItem(results[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

  const executeItem = (item: SearchResultItem) => {
    if (item.type === 'file') {
      // Toggle selection and locate/scroll to node in tree
      onToggleFileSelect(item.relativePath);
      onLocateNodeInTree(item.relativePath, false);
      // Requirement 3.2: Keep dropdown open to support continuous actions
      setIsDropdownOpen(true);
    } else {
      // Folder: only locate and expand ancestors, do not toggle selection
      onLocateNodeInTree(item.relativePath, true);
      setIsDropdownOpen(true);
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
            disabled={!isFdAvailable}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              if (inputValue.trim()) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              !isFdAvailable
                ? 'fd-find 不可用：搜索已停用 (建议在系统中安装 fd: winget install sharkdp.fd)'
                : '搜索文件或文件夹路径 (Ctrl+F 快速聚焦，500ms 自动搜索)'
            }
            className={`w-full pl-9 pr-28 py-2 bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none transition-all shadow-2xs ${
              !isFdAvailable
                ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 cursor-not-allowed placeholder-rose-400 dark:placeholder-rose-500/70'
                : isSearchIncomplete
                ? 'border-amber-400 dark:border-amber-500/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-400'
                : 'border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
          />

          {/* Quick Clear or Keyboard Hints / fd status badge inside search input */}
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center space-x-1.5">
            {!isFdAvailable ? (
              <span className="flex items-center space-x-1 px-2 py-0.5 text-[11px] bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800/80 font-medium">
                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                <span>fd 不可用</span>
              </span>
            ) : (
              <>
                {inputValue && (
                  <button
                    onClick={() => {
                      setInputValue('');
                      setResults([]);
                      setHasSearched(false);
                      setIsDropdownOpen(false);
                      inputRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                    title="清空搜索"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {isSearchIncomplete && (
                  <span className="flex items-center space-x-1 px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800/80 font-mono">
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
              匹配路径结果 ({results.length} / 共 {totalMatchesCount} 条)
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              文件回车切换勾选，目录回车仅定位 (保持下拉开启)
            </span>
          </div>

          {/* Results list */}
          <div className="max-h-72 overflow-y-auto">
            {results.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                {isSearchIncomplete ? (
                  <div className="flex flex-col items-center justify-center space-y-1 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    <span className="font-medium">搜索不完整，未能读取到匹配结果</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">底层 fd 遍历报告受限</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Info className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">没有搜索到</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      请检查相对路径、扩展名或确认是否已被排除规则忽略
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
                    key={item.id}
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
                        <div
                          className="shrink-0 text-slate-400 hover:text-blue-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            executeItem(item);
                          }}
                        >
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
                          {renderHighlightedText(item.relativePath, inputValue)}
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

          {/* Over-10 Items Warning: Requirement 3.2 */}
          {totalMatchesCount > 10 && (
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="font-medium">
                  结果过多 ({totalMatchesCount} 条)，请输入更准确的路径
                </span>
              </div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400/80">已按路径升序截断显示前 10 条</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
