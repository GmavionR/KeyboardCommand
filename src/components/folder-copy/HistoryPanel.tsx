import React, { useState } from 'react';
import {
  History,
  Copy,
  RefreshCw,
  Trash2,
  ChevronDown,
  Eye,
  Clock,
  Check,
} from 'lucide-react';
import { CopyHistoryItem } from '../../types';

interface HistoryPanelProps {
  historyList: CopyHistoryItem[];
  currentFolderPath: string;
  onCopySnapshot: (item: CopyHistoryItem) => void;
  onReReadFile: (item: CopyHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onViewSnapshot: (item: CopyHistoryItem) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyList,
  currentFolderPath,
  onCopySnapshot,
  onReReadFile,
  onDeleteHistory,
  onViewSnapshot,
}) => {
  const [filterScope, setFilterScope] = useState<'current' | 'all'>('current');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter list
  const filteredList =
    filterScope === 'current'
      ? historyList.filter((item) => item.sourceFolder === currentFolderPath)
      : historyList;

  const handleCopySnapshotClick = (item: CopyHistoryItem) => {
    onCopySnapshot(item);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors duration-150">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            复制历史 ({filteredList.length} / 上限 20)
          </span>
        </div>

        {/* Filter Toggle: Current Folder vs All */}
        <div className="flex items-center space-x-1 text-[11px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-0.5">
          <button
            onClick={() => setFilterScope('current')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              filterScope === 'current'
                ? 'bg-blue-600 text-white font-medium shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="仅显示当前根目录的历史记录"
          >
            当前目录
          </button>
          <button
            onClick={() => setFilterScope('all')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              filterScope === 'all'
                ? 'bg-blue-600 text-white font-medium shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="显示所有全局历史记录"
          >
            全部
          </button>
        </div>
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 p-2 space-y-2">
        {filteredList.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 text-xs">
            <Clock className="w-7 h-7 text-slate-400 dark:text-slate-600 mb-2 stroke-1" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">暂无复制历史记录</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {filterScope === 'current'
                ? '当前文件夹下尚未生成文件上下文包'
                : '未产生任何复制记录'}
            </span>
          </div>
        ) : (
          filteredList.map((item) => {
            const isDropdownOpen = openDropdownId === item.id;
            const isCurrentFolder = item.sourceFolder === currentFolderPath;

            return (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-lg p-2.5 transition-all text-xs"
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <span className="font-mono text-slate-700 dark:text-slate-300">{item.createdAt}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {item.fileCount} 个文件
                    </span>
                  </div>

                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono truncate max-w-[120px] ${
                      isCurrentFolder
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                    title={item.sourceFolder}
                  >
                    {item.sourceFolder.split('\\').pop() || item.sourceFolder}
                  </span>
                </div>

                {/* File list preview pill tags */}
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {item.filePaths.slice(0, 3).map((p) => {
                    const fname = p.split('/').pop() || p;
                    return (
                      <span
                        key={p}
                        className="text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded truncate max-w-[140px]"
                        title={p}
                      >
                        {fname}
                      </span>
                    );
                  })}
                  {item.filePaths.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                      +{item.filePaths.length - 3} 项
                    </span>
                  )}
                </div>

                {/* Action Buttons Group */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-slate-800/60">
                  <button
                    onClick={() => onViewSnapshot(item)}
                    className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="查看当时保存的包内容快照"
                  >
                    <Eye className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                    <span>查看快照</span>
                  </button>

                  <div className="flex items-center space-x-1 relative">
                    {/* Main Button: Copy saved snapshot */}
                    <button
                      onClick={() => handleCopySnapshotClick(item)}
                      className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium transition-all cursor-pointer shadow-2xs"
                      title="直接复制已保存快照，不重新读取源文件"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-300" />
                          <span>已复制快照</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>复制已保存内容</span>
                        </>
                      )}
                    </button>

                    {/* Re-read dropdown trigger */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdownId(isDropdownOpen ? null : item.id)
                        }
                        className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
                        title="更多操作（重读当前文件）"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 text-xs">
                          <button
                            onClick={() => {
                              onReReadFile(item);
                              setOpenDropdownId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            <div>
                              <div className="font-medium text-[11px]">读取当前文件</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                重新读取磁盘并替换本记录
                              </div>
                            </div>
                          </button>

                          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                          <button
                            onClick={() => {
                              onDeleteHistory(item.id);
                              setOpenDropdownId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 flex items-center space-x-2 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[11px]">删除此条历史</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete single button */}
                    <button
                      onClick={() => onDeleteHistory(item.id)}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors cursor-pointer"
                      title="删除此历史记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
