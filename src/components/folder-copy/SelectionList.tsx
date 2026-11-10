import React from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import {
  FileCheck2,
  Trash2,
  X,
  FileCode,
  Eye,
  FolderTree,
} from 'lucide-react';
import { FileNode } from '../../types';
import { findNodeByPath, formatBytes } from '../../utils/treeUtils';

interface SelectionListProps {
  selectedPaths: Set<string>;
  selectedSizes: Map<string, number>;
  rootNode: FileNode;
  onRemovePath: (path: string) => void;
  onClearAll: () => void;
  onLocateInTree: (path: string) => void;
  onPreviewPackage: () => void;
}

export const SelectionList: React.FC<SelectionListProps> = ({
  selectedPaths,
  selectedSizes,
  rootNode,
  onRemovePath,
  onClearAll,
  onLocateInTree,
  onPreviewPackage,
}) => {
  const selectedArray = Array.from(selectedPaths);
  const totalCount = selectedArray.length;
  const [copiedPathsList, setCopiedPathsList] = React.useState(false);
  const [copyPathsError, setCopyPathsError] = React.useState(false);

  const totalBytes = selectedArray.reduce(
    (acc, p) => acc + (selectedSizes.get(p) ?? findNodeByPath(rootNode, p)?.size ?? 0),
    0
  );

  const handleCopyPathsList = async () => {
    if (selectedArray.length === 0) return;
    setCopyPathsError(false);
    try {
      await writeText(selectedArray.join('\n'));
      setCopiedPathsList(true);
      setTimeout(() => setCopiedPathsList(false), 1800);
    } catch {
      setCopiedPathsList(false);
      setCopyPathsError(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors duration-150">
      {/* Header with count and actions */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            已选择文件 (<span className="tabular-nums font-mono">{totalCount}</span>)
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {totalCount > 0 && (
            <>
              <button
                onClick={handleCopyPathsList}
                className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                title="复制全部勾选文件的相对路径清单 (换行分隔)"
              >
                <span>{copyPathsError ? '复制失败' : copiedPathsList ? '已复制路径' : '复制路径'}</span>
              </button>
              <button
                onClick={onPreviewPackage}
                className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                title="预览即将合成生成的文件上下文包"
              >
                <Eye className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                <span>预览</span>
              </button>
              <button
                onClick={onClearAll}
                className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                title="清空当前所有选择"
              >
                <Trash2 className="w-3 h-3" />
                <span>清空</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 p-1">
        {totalCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
            <FolderTree className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2 stroke-1" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">当前无任何勾选文件</span>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
              在左侧文件树勾选文件或目录，或使用上方搜索框回车快速勾选
            </p>
          </div>
        ) : (
          selectedArray.map((path) => {
            const node = findNodeByPath(rootNode, path);
            const fileName = path.split('/').pop() || path;
            const dirPart = path.includes('/')
              ? path.substring(0, path.lastIndexOf('/'))
              : '';

            return (
              <div
                key={path}
                className="group flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded transition-colors text-xs"
              >
                <div
                  onClick={() => onLocateInTree(path)}
                  className="min-w-0 flex-1 cursor-pointer"
                  title="点击在左侧文件树中定位并高亮"
                >
                  <div className="flex items-center space-x-1.5">
                    <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-[11px]">
                      {fileName}
                    </span>
                    {(selectedSizes.has(path) || node?.size !== undefined) && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        ({formatBytes(selectedSizes.get(path) ?? node?.size)})
                      </span>
                    )}
                  </div>
                  {dirPart && (
                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate pl-5">
                      {dirPart}
                    </div>
                  )}
                </div>

                {/* Direct Remove Button (Issue 32) */}
                <button
                  type="button"
                  onClick={() => onRemovePath(path)}
                  className="opacity-60 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all cursor-pointer shrink-0 ml-2"
                  title="从当前选择中移除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      {totalCount > 0 && (
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span>共 <strong className="tabular-nums font-mono text-slate-800 dark:text-slate-200">{totalCount}</strong> 个文件待打包</span>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
            <span>~{formatBytes(totalBytes)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
