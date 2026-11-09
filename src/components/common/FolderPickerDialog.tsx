import React, { useState } from 'react';
import {
  Folder,
  HardDrive,
  ChevronRight,
  ChevronDown,
  X,
  FolderPlus,
  Check,
  FolderOpen,
  Laptop,
} from 'lucide-react';

interface FolderPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folderPath: string) => void;
  currentPath: string;
}

interface DirItem {
  id: string;
  name: string;
  path: string;
  children?: DirItem[];
}

const SYSTEM_DRIVES: DirItem[] = [
  {
    id: 'drive-c',
    name: '本地磁盘 (C:)',
    path: 'C:\\',
    children: [
      {
        id: 'c-users',
        name: 'Users',
        path: 'C:\\Users',
        children: [
          {
            id: 'c-users-dev',
            name: 'Developer',
            path: 'C:\\Users\\Developer',
            children: [
              { id: 'c-dev-workspace', name: 'workspace', path: 'C:\\Users\\Developer\\workspace' },
              { id: 'c-dev-desktop', name: 'Desktop', path: 'C:\\Users\\Developer\\Desktop' },
              { id: 'c-dev-docs', name: 'Documents', path: 'C:\\Users\\Developer\\Documents' },
            ],
          },
        ],
      },
      { id: 'c-prog', name: 'Program Files', path: 'C:\\Program Files' },
    ],
  },
  {
    id: 'drive-d',
    name: '工作与数据盘 (D:)',
    path: 'D:\\',
    children: [
      {
        id: 'd-projects',
        name: 'projects',
        path: 'D:\\projects',
        children: [
          {
            id: 'd-proj-kbc',
            name: 'keyboard-command-core',
            path: 'D:\\projects\\keyboard-command-core',
          },
          {
            id: 'd-proj-web',
            name: 'react-enterprise-admin',
            path: 'D:\\projects\\react-enterprise-admin',
          },
          {
            id: 'd-proj-ai',
            name: 'llm-context-pipeline',
            path: 'D:\\projects\\llm-context-pipeline',
          },
          {
            id: 'd-proj-mobile',
            name: 'cross-platform-client',
            path: 'D:\\projects\\cross-platform-client',
          },
        ],
      },
      {
        id: 'd-data',
        name: 'data-vault',
        path: 'D:\\data-vault',
      },
    ],
  },
  {
    id: 'drive-e',
    name: '备份与归档 (E:)',
    path: 'E:\\',
    children: [
      { id: 'e-archive', name: 'archives_2026', path: 'E:\\archives_2026' },
      { id: 'e-repos', name: 'git_mirrors', path: 'E:\\git_mirrors' },
    ],
  },
];

export const FolderPickerDialog: React.FC<FolderPickerDialogProps> = ({
  isOpen,
  onClose,
  onSelectFolder,
  currentPath,
}) => {
  if (!isOpen) return null;

  const [selectedFolderPath, setSelectedFolderPath] = useState(currentPath);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(['drive-d', 'd-projects'])
  );

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedFolderPath.trim()) {
      onSelectFolder(selectedFolderPath.trim());
      onClose();
    }
  };

  const renderTree = (items: DirItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expandedIds.has(item.id);
      const isSelected = selectedFolderPath.toLowerCase() === item.path.toLowerCase();
      const hasChildren = !!item.children && item.children.length > 0;
      const isDrive = depth === 0;

      return (
        <div key={item.id} className="select-none">
          <div
            onClick={() => setSelectedFolderPath(item.path)}
            className={`flex items-center px-2 py-1 text-xs cursor-pointer rounded transition-colors group ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {/* Expand / Collapse arrow */}
            <span
              onClick={(e) => hasChildren && toggleExpand(item.id, e)}
              className={`w-4 h-4 flex items-center justify-center mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${
                hasChildren ? 'cursor-pointer' : 'opacity-0 pointer-events-none'
              }`}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )
              ) : null}
            </span>

            {/* Icon */}
            {isDrive ? (
              <HardDrive
                className={`w-4 h-4 mr-1.5 shrink-0 ${
                  isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              />
            ) : (
              <Folder
                className={`w-4 h-4 mr-1.5 shrink-0 ${
                  isSelected ? 'text-white' : 'text-amber-500 dark:text-amber-400'
                }`}
              />
            )}

            {/* Name */}
            <span className="truncate flex-1 font-mono">{item.name}</span>
          </div>

          {/* Children */}
          {hasChildren && isExpanded && (
            <div>{renderTree(item.children!, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Windows Style Dialog Header */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              选择文件夹 - Windows 浏览对话框
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Subtitle & Location Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 mb-1.5">
            <Laptop className="w-3.5 h-3.5" />
            <span>此电脑 (This PC) &gt; 请选择要加载为根目录的目标文件夹：</span>
          </div>
        </div>

        {/* Tree View for Folders */}
        <div className="h-72 overflow-y-auto p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          {renderTree(SYSTEM_DRIVES)}
        </div>

        {/* Bottom Current Folder Input & Actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 space-y-2.5">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium">
              文件夹路径:
            </span>
            <input
              type="text"
              value={selectedFolderPath}
              onChange={(e) => setSelectedFolderPath(e.target.value)}
              className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                const newPath = `${selectedFolderPath}\\new-folder-${Date.now().toString().slice(-4)}`;
                setSelectedFolderPath(newPath);
              }}
              className="flex items-center space-x-1 px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-xs transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>新建文件夹</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>选择文件夹</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
