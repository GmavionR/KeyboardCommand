import React from 'react';
import { Copy, FileCheck, AlertCircle } from 'lucide-react';

interface CopyActionBarProps {
  selectedCount: number;
  onExecuteCopy: () => void;
  isCopying?: boolean;
}

export const CopyActionBar: React.FC<CopyActionBarProps> = ({
  selectedCount,
  onExecuteCopy,
  isCopying = false,
}) => {
  const isDisabled = selectedCount === 0 || isCopying;

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-lg transition-colors duration-150">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-slate-700 dark:text-slate-300">
            当前选中：
            <span className="font-bold text-slate-900 dark:text-white ml-1">
              {selectedCount}
            </span>{' '}
            个文件
          </span>
        </div>

        {selectedCount === 0 && (
          <span className="text-[11px] text-amber-800 dark:text-amber-400/80 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40 hidden sm:inline-flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            勾选文件后方可生成文件上下文包
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onExecuteCopy}
          disabled={isDisabled}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-xs transition-all shadow-md cursor-pointer ${
            isDisabled
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/60'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-500/25 ring-1 ring-blue-400/40'
          }`}
          title={
            isDisabled
              ? '请至少选择一个文件'
              : '将所选文件代码及完整结构复制为文件上下文包 (Ctrl+Shift+C)'
          }
        >
          {isCopying ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
          ) : (
            <Copy className="w-4 h-4 shrink-0" />
          )}
          <span>
            {isCopying ? '正在合成上下文包...' : '复制文件上下文包'}
          </span>
          {selectedCount > 0 && !isCopying && (
            <span className="bg-blue-700/90 text-white px-1.5 py-0.2 rounded text-[11px] font-mono tabular-nums">
              {selectedCount}
            </span>
          )}
          <span className="text-[10px] bg-blue-900/60 dark:bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-400/30 text-blue-100 dark:text-blue-200 font-mono hidden md:inline">
            Ctrl+Shift+C
          </span>
        </button>
      </div>
    </div>
  );
};
