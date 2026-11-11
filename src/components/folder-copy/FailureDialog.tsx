import React, { useState } from 'react';
import {
  AlertOctagon,
  X,
  FileX,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  MinusCircle,
} from 'lucide-react';
import { CopyFailureDetail } from '../../types';

interface FailureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  failures: CopyFailureDetail[];
  onRetry: () => void;
  onExcludeFailedAndRetry: (failedPaths: string[]) => void;
}

export const FailureDialog: React.FC<FailureDialogProps> = ({
  isOpen,
  onClose,
  failures,
  onRetry,
  onExcludeFailedAndRetry,
}) => {
  if (!isOpen || failures.length === 0) return null;

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800/80 w-full max-w-2xl rounded-xl shadow-2xl shadow-rose-950/20 dark:shadow-rose-950/40 flex flex-col overflow-hidden max-h-[80vh] text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-rose-100 dark:bg-rose-600/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-500/40">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                复制文件上下文包失败 (操作已取消)
              </h2>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80">
                根据规则：任一文件读取失败整次复制取消，剪贴板和历史保持不变，保留原有勾选状态
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Failure summary & files */}
        <div className="p-5 overflow-y-auto space-y-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-200">受阻文件统计: </span>
              <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">
                {failures.length} 个文件无法读取
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              长路径已按规范使用独立弹窗承载展示
            </span>
          </div>

          {/* Expandable list of failed files */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
            {failures.map((item, index) => {
              const isExp = expandedIndex === index;
              return (
                <div key={item.filePath} className="p-2.5 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition-colors">
                  <div
                    onClick={() => setExpandedIndex(isExp ? null : index)}
                    className="flex items-start justify-between cursor-pointer space-x-2"
                  >
                    <div className="flex items-start space-x-2 min-w-0 flex-1">
                      <FileX className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs text-rose-700 dark:text-rose-300 break-all font-semibold">
                          {item.filePath}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded font-mono text-[10px]">
                            {item.code}
                          </span>
                          <span>{item.reason}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 shrink-0">
                      {isExp ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Expanded error trace */}
                  {isExp && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 pl-6 text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-950/80 p-2 rounded">
                      <div>技术详情:</div>
                      <div className="text-rose-600 dark:text-rose-400/90 mt-1">
                        {item.detail}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
          >
            保留勾选并关闭
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onExcludeFailedAndRetry(failures.map((f) => f.filePath))}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-medium transition-colors cursor-pointer shadow-xs"
              title="取消勾选这些失效文件，并立即复制剩余有效文件"
            >
              <MinusCircle className="w-3.5 h-3.5" />
              <span>剔除失效项后重试</span>
            </button>

            <button
              onClick={onRetry}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新读取重试</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
