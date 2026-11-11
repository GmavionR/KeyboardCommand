import React, { useState } from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { X, Copy, Check, FileText } from 'lucide-react';

interface PackagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  fileCount: number;
}

export const PackagePreviewModal: React.FC<PackagePreviewModalProps> = ({
  isOpen,
  onClose,
  markdownContent,
  fileCount,
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await writeText(markdownContent);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                文件上下文包预览
                <span className="text-[10px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-1.5 py-0.2 rounded font-mono">
                  共 {fileCount} 个文件
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                以代码块与路径头标准格式组织，可直接粘贴喂入大语言模型或协作工具
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

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs select-text border-y border-slate-200 dark:border-slate-800">
          <pre className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-300">
            {markdownContent}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            字符数: {markdownContent.length.toLocaleString()} | 行数: {markdownContent.split('\n').length}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium cursor-pointer"
            >
              关闭
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>已复制到剪贴板</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制上下文包</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
