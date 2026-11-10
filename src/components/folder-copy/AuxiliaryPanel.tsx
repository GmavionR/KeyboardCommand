import React from 'react';
import { FileCheck2, History } from 'lucide-react';
import { FileNode, CopyHistoryItem } from '../../types';
import { SelectionList } from './SelectionList';
import { HistoryPanel } from './HistoryPanel';

export type AuxiliaryView = 'selection' | 'history';

interface AuxiliaryPanelProps {
  activeView: AuxiliaryView;
  onChangeView: (view: AuxiliaryView) => void;
  // Selection List Props
  selectedPaths: Set<string>;
  selectedSizes: Map<string, number>;
  rootNode: FileNode;
  onRemovePath: (path: string) => void;
  onClearAll: () => void;
  onLocateInTree: (path: string) => void;
  onPreviewPackage: () => void;
  // History Panel Props
  historyList: CopyHistoryItem[];
  currentFolderPath: string;
  onCopySnapshot: (item: CopyHistoryItem) => void;
  onReReadFile: (item: CopyHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onViewSnapshot: (item: CopyHistoryItem) => void;
}

export const AuxiliaryPanel: React.FC<AuxiliaryPanelProps> = ({
  activeView,
  onChangeView,
  selectedPaths,
  selectedSizes,
  rootNode,
  onRemovePath,
  onClearAll,
  onLocateInTree,
  onPreviewPackage,
  historyList,
  currentFolderPath,
  onCopySnapshot,
  onReReadFile,
  onDeleteHistory,
  onViewSnapshot,
}) => {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors duration-150">
      {/* Tab Switcher Header */}
      <div className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-2 pt-1 flex items-center justify-between">
        <div className="flex space-x-1">
          {/* Tab 1: 当前选择 */}
          <button
            type="button"
            onClick={() => onChangeView('selection')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'selection'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900/60 rounded-t'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/30'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>当前选择</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeView === 'selection'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {selectedPaths.size}
            </span>
          </button>

          {/* Tab 2: 复制历史 */}
          <button
            type="button"
            onClick={() => onChangeView('history')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'history'
                ? 'border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900/60 rounded-t'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/30'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>复制历史</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeView === 'history'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {historyList.length}
            </span>
          </button>
        </div>

        <span className="text-[10px] text-slate-400 dark:text-slate-500 pr-2">
          辅助面板 (占 1/3)
        </span>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'selection' ? (
          <SelectionList
            selectedPaths={selectedPaths}
            selectedSizes={selectedSizes}
            rootNode={rootNode}
            onRemovePath={onRemovePath}
            onClearAll={onClearAll}
            onLocateInTree={onLocateInTree}
            onPreviewPackage={onPreviewPackage}
          />
        ) : (
          <HistoryPanel
            historyList={historyList}
            currentFolderPath={currentFolderPath}
            onCopySnapshot={onCopySnapshot}
            onReReadFile={onReReadFile}
            onDeleteHistory={onDeleteHistory}
            onViewSnapshot={onViewSnapshot}
          />
        )}
      </div>
    </div>
  );
};
