import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileSpreadsheet,
  File,
  ExternalLink,
  CheckSquare,
  Square,
  MinusSquare,
  Slash,
  PlusCircle,
  EyeOff,
  Copy,
  Keyboard,
} from 'lucide-react';
import { FileNode, SettingsConfig } from '../../types';
import {
  getNodeTriState,
  formatBytes,
  isFileAllowed,
} from '../../utils/treeUtils';

interface FileTreeProps {
  rootNode: FileNode;
  currentFolderPath: string;
  isFolderLoaded: boolean;
  isLoadingFolder: boolean;
  loadingPaths: Set<string>;
  settings: SettingsConfig;
  selectedPaths: Set<string>;
  selectableCounts: Map<string, number>;
  onToggleFile: (path: string) => void;
  onToggleFolderRecursive: (node: FileNode, shouldSelect: boolean) => void;
  highlightedPath?: string | null;
  expandedFolders: Set<string>;
  onToggleExpandFolder: (path: string) => void;
  onLoadMore: (path: string) => void;
  onCopySingleFile?: (node: FileNode) => void;
  onRevealNodeInFileManager?: (node: FileNode) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onSelectAllValid?: () => void;
  onClearAll?: () => void;
}

// Flatten all visible nodes in DFS order according to current expansion state
function getFlattenedVisibleNodes(
  root: FileNode,
  expanded: Set<string>
): FileNode[] {
  const result: FileNode[] = [];

  function traverse(node: FileNode) {
    result.push(node);
    if (
      node.type === 'directory' &&
      node.children &&
      (node.path === '' || expanded.has(node.path))
    ) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return result;
}

export const FileTree: React.FC<FileTreeProps> = ({
  rootNode,
  currentFolderPath,
  isFolderLoaded,
  isLoadingFolder,
  loadingPaths,
  settings,
  selectedPaths,
  selectableCounts,
  onToggleFile,
  onToggleFolderRecursive,
  highlightedPath,
  expandedFolders,
  onToggleExpandFolder,
  onLoadMore,
  onCopySingleFile,
  onRevealNodeInFileManager,
  onExpandAll,
  onCollapseAll,
  onSelectAllValid,
  onClearAll,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active keyboard-focused node path
  const [focusedPath, setFocusedPath] = useState<string | null>(() => {
    return rootNode.children && rootNode.children.length > 0
      ? rootNode.children[0].path
      : rootNode.path;
  });

  // Context Menu state for right click on selectable file and directory nodes
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetNode: FileNode;
  } | null>(null);

  // Synchronize focus when a node is highlighted externally (e.g. from Search)
  useEffect(() => {
    if (highlightedPath !== undefined && highlightedPath !== null) {
      setFocusedPath(highlightedPath);
    }
  }, [highlightedPath]);

  useEffect(() => {
    const visiblePaths = getFlattenedVisibleNodes(rootNode, expandedFolders)
      .map((node) => node.path)
      .filter(Boolean);
    if (focusedPath && visiblePaths.includes(focusedPath)) return;
    setFocusedPath(visiblePaths[0] ?? null);
  }, [rootNode, expandedFolders, focusedPath]);

  // Smoothly scroll the focused element into view
  useEffect(() => {
    if (!focusedPath || !containerRef.current) return;
    try {
      const el = containerRef.current.querySelector(
        `[data-node-path="${CSS.escape(focusedPath)}"]`
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } catch {
      // CSS.escape fallback if path contains unusual characters
    }
  }, [focusedPath]);

  // Close context menu on any outside click or escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [contextMenu]);

  // Keyboard navigation handler for tree:
  // - ArrowUp / ArrowDown: Move focused node
  // - Space: Expand/Collapse directory, or Select/Deselect file
  // - Enter: Expand/Collapse directory, or Select/Deselect file
  // - ArrowRight: Expand folder or move to first child
  // - ArrowLeft: Collapse folder or move to parent folder
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const visibleNodes = getFlattenedVisibleNodes(rootNode, expandedFolders);
    if (visibleNodes.length === 0) return;

    const currentIndex = visibleNodes.findIndex((n) => n.path === focusedPath);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex =
        currentIndex < 0
          ? 0
          : Math.min(visibleNodes.length - 1, currentIndex + 1);
      setFocusedPath(visibleNodes[nextIndex].path);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex =
        currentIndex < 0 ? 0 : Math.max(0, currentIndex - 1);
      setFocusedPath(visibleNodes[prevIndex].path);
    } else if (e.key === ' ') {
      // Space key: Expand/Collapse on directory, Select/Deselect on file
      e.preventDefault();
      const currentNode = visibleNodes.find((n) => n.path === focusedPath);
      if (currentNode) {
        if (currentNode.type === 'directory') {
          if (!currentNode.isIgnored && !currentNode.isExcluded) {
            onToggleExpandFolder(currentNode.path);
          }
        } else {
          if (
            !currentNode.isIgnored &&
            !currentNode.isExcluded &&
            isFileAllowed(currentNode.name, currentNode.path, settings)
          ) {
            onToggleFile(currentNode.path);
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentNode = visibleNodes.find((n) => n.path === focusedPath);
      if (currentNode) {
        if (currentNode.type === 'directory') {
          if (!currentNode.isIgnored && !currentNode.isExcluded) {
            onToggleExpandFolder(currentNode.path);
          }
        } else {
          if (
            !currentNode.isIgnored &&
            !currentNode.isExcluded &&
            isFileAllowed(currentNode.name, currentNode.path, settings)
          ) {
            onToggleFile(currentNode.path);
          }
        }
      }
    } else if (e.key === 'ArrowRight') {
      const currentNode = visibleNodes.find((n) => n.path === focusedPath);
      if (currentNode && currentNode.type === 'directory') {
        if (!expandedFolders.has(currentNode.path)) {
          e.preventDefault();
          onToggleExpandFolder(currentNode.path);
        } else if (currentNode.children && currentNode.children.length > 0) {
          e.preventDefault();
          setFocusedPath(currentNode.children[0].path);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const currentNode = visibleNodes.find((n) => n.path === focusedPath);
      if (currentNode) {
        if (currentNode.type === 'directory' && expandedFolders.has(currentNode.path)) {
          e.preventDefault();
          onToggleExpandFolder(currentNode.path);
        } else {
          // Jump to parent directory
          const pathSegments = currentNode.path.split('/');
          if (pathSegments.length > 1) {
            pathSegments.pop();
            const parentPath = pathSegments.join('/');
            e.preventDefault();
            setFocusedPath(parentPath);
          }
        }
      }
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, node: FileNode) => {
    const isSelectableNode =
      !node.isIgnored &&
      !node.isExcluded &&
      (node.type === 'directory' || isFileAllowed(node.name, node.path, settings));

    if (
      isSelectableNode
    ) {
      e.preventDefault();
      e.stopPropagation();
      setFocusedPath(node.path);
      const menuWidth = 240;
      const menuHeight = node.type === 'file' ? 132 : 94;
      const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
      const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
      setContextMenu({ x, y, targetNode: node });
    } else {
      setContextMenu(null);
    }
  };

  if (!currentFolderPath) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
        <Folder className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-2 stroke-1" />
        <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs">
          选择要浏览的文件夹
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
          使用上方的「选择文件夹」按钮，或在路径栏输入 Windows 文件夹路径后按 Enter。
        </p>
      </div>
    );
  }

  if (isLoadingFolder && !isFolderLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        正在读取文件夹…
      </div>
    );
  }

  if (isFolderLoaded && !rootNode.children?.length) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
        <Folder className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-2 stroke-1" />
        <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs">
          空文件夹 / 无符合规则文件
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
          当前目录下没有发现符合规则的文件。可能原因为目录为空，或所有内容已被排除规则与白名单过滤。可在右上角「规则设置」中调整白名单与排除规则。
        </p>
      </div>
    );
  }

  const focusedNode = getFlattenedVisibleNodes(rootNode, expandedFolders).find(
    (n) => n.path === focusedPath
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Batch Actions & Quick Tools Sub-bar */}
      <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 shrink-0 select-none">
        <div className="flex items-center space-x-2">
          {onExpandAll && (
            <button
              type="button"
              onClick={onExpandAll}
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
              title="展开树中所有目录"
            >
              全部展开
            </button>
          )}
          <span className="text-slate-300 dark:text-slate-700">|</span>
          {onCollapseAll && (
            <button
              type="button"
              onClick={onCollapseAll}
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
              title="折叠树中所有目录"
            >
              全部折叠
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onSelectAllValid && (
            <button
              type="button"
              onClick={onSelectAllValid}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline cursor-pointer"
              title="快速全选当前根目录下所有符合规则的文件"
            >
              全选符合规则
            </button>
          )}
          <span className="text-slate-300 dark:text-slate-700">|</span>
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="hover:text-rose-600 dark:hover:text-rose-400 hover:underline cursor-pointer"
              title="清空当前所有选中的文件"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Tree View with Keyboard Listener */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-y-auto select-none font-sans text-xs text-slate-800 dark:text-slate-200 p-2 outline-hidden focus:ring-1 focus:ring-blue-500/30"
      >
        <TreeNode
          node={rootNode}
          depth={0}
          settings={settings}
          selectedPaths={selectedPaths}
          selectableCounts={selectableCounts}
          onToggleFile={onToggleFile}
          onToggleFolderRecursive={onToggleFolderRecursive}
          highlightedPath={highlightedPath}
          focusedPath={focusedPath}
          onFocusNode={setFocusedPath}
          expandedFolders={expandedFolders}
          onToggleExpandFolder={onToggleExpandFolder}
          onLoadMore={onLoadMore}
          loadingPaths={loadingPaths}
          onContextMenu={handleNodeContextMenu}
        />
      </div>

      {/* Keyboard navigation helper footer bar */}
      <div className="px-3 py-1 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono select-none">
        <div className="flex items-center space-x-1.5">
          <Keyboard className="w-3.5 h-3.5 text-blue-500" />
          <span>↑↓ 移动 | 空格 展开或勾选 | ←→ 折叠/展开 | ↵ 确认</span>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
          聚焦: <span className="text-blue-600 dark:text-blue-400 font-bold">{focusedNode?.name || '(未选)'}</span>
        </div>
      </div>

      {/* Right-click context menu for selectable nodes */}
      {contextMenu && (
        <div
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          className="fixed z-50 bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-2xl py-1 text-xs text-slate-800 dark:text-slate-200 min-w-[210px] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[230px]">
            {contextMenu.targetNode.name}
          </div>

          {contextMenu.targetNode.type === 'file' && (
            <button
              type="button"
              onClick={() => {
                onCopySingleFile?.(contextMenu.targetNode);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-600/30 hover:text-blue-600 dark:hover:text-white flex items-center justify-between space-x-2 transition-colors cursor-pointer group"
              title="生成单文件文件上下文包并加入历史，不改变当前已有的勾选状态"
            >
              <div className="flex items-center space-x-2">
                <Copy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  仅复制当前文件
                </span>
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400/90 font-mono">
                单文件包
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onRevealNodeInFileManager?.(contextMenu.targetNode);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-600/30 hover:text-blue-600 dark:hover:text-white flex items-center space-x-2 transition-colors cursor-pointer group"
            title="在系统文件管理器中打开此文件或文件夹"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              在文件资源管理器中显示
            </span>
          </button>

          <div className="px-3 py-1 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/40">
            不改变已有的文件或文件夹选择状态
          </div>
        </div>
      )}
    </div>
  );
};

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  settings: SettingsConfig;
  selectedPaths: Set<string>;
  selectableCounts: Map<string, number>;
  onToggleFile: (path: string) => void;
  onToggleFolderRecursive: (node: FileNode, shouldSelect: boolean) => void;
  highlightedPath?: string | null;
  focusedPath: string | null;
  onFocusNode: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleExpandFolder: (path: string) => void;
  onLoadMore: (path: string) => void;
  loadingPaths: Set<string>;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  settings,
  selectedPaths,
  selectableCounts,
  onToggleFile,
  onToggleFolderRecursive,
  highlightedPath,
  focusedPath,
  onFocusNode,
  expandedFolders,
  onToggleExpandFolder,
  onLoadMore,
  loadingPaths,
  onContextMenu,
}) => {
  const totalChildren = node.childrenCount ?? node.children?.length ?? 0;
  const loadedChildren = node.children?.length ?? 0;
  const isLargeDirectory = node.type === 'directory' && totalChildren > settings.largeDirThreshold;
  const isNodeBlocked = !!node.isIgnored || !!node.isExcluded;
  const isNodeLoading = loadingPaths.has(node.path);

  const isExpanded = node.path === '' ? true : expandedFolders.has(node.path);
  const isHighlighted = highlightedPath === node.path;
  const isFocused = focusedPath === node.path;

  const triState =
    node.type === 'directory'
      ? getNodeTriState(node, selectedPaths, settings, selectableCounts)
      : selectedPaths.has(node.path)
      ? 'checked'
      : 'unchecked';

  const handleFolderCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNodeBlocked) return;
    onFocusNode(node.path);
    const shouldSelect = triState !== 'checked';
    onToggleFolderRecursive(node, shouldSelect);
  };

  const handleFileCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocusNode(node.path);
    onToggleFile(node.path);
  };

  const handleRowClick = () => {
    onFocusNode(node.path);
    if (isNodeBlocked) return;
    if (node.type === 'directory') {
      onToggleExpandFolder(node.path);
    } else {
      onToggleFile(node.path);
    }
  };

  const renderFileIcon = () => {
    const ext = node.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return <FileCode className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />;
      case 'md':
      case 'txt':
        return <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />;
      case 'css':
      case 'scss':
        return <FileSpreadsheet className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLoadMore(node.path);
  };

  return (
    <div className="w-full">
      {/* Node Row */}
      <div
        data-node-path={node.path}
        onClick={handleRowClick}
        onContextMenu={(e) => onContextMenu(e, node)}
        style={{ paddingLeft: `${depth * 18 + 6}px` }}
        className={`group flex items-center justify-between py-1 px-2 rounded-md cursor-pointer transition-all ${
          isFocused
            ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-100/90 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-semibold shadow-xs'
            : isHighlighted
            ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-400 font-medium'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
        } ${
          isNodeBlocked
            ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500'
            : ''
        }`}
        title={
          node.type === 'file' && !isNodeBlocked
            ? `${node.path} (右键可复制当前文件或在文件资源管理器中显示，空格切换勾选)`
            : node.type === 'directory' && !isNodeBlocked
            ? `${node.path} (右键可在文件资源管理器中显示，空格展开/折叠)`
            : `${node.path} (空格展开/折叠)`
        }
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {/* Expand/Collapse Chevron */}
          {node.type === 'directory' ? (
            isNodeBlocked ? (
              <span className="w-4 h-4 flex items-center justify-center text-slate-400 dark:text-slate-600">
                <Slash className="w-3 h-3" />
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFocusNode(node.path);
                  onToggleExpandFolder(node.path);
                }}
                className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                title={isExpanded ? '折叠目录' : '展开目录'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            )
          ) : (
            <span className="w-4 h-4 shrink-0" />
          )}

          {/* Tri-state Checkbox */}
          {!isNodeBlocked ? (
            <button
              type="button"
              onClick={
                node.type === 'directory'
                  ? handleFolderCheckboxClick
                  : handleFileCheckboxClick
              }
              className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors cursor-pointer"
              title={
                node.type === 'directory'
                  ? triState === 'checked'
                    ? '全选状态 (点击取消勾选全目录)'
                    : triState === 'indeterminate'
                    ? '部分选中状态 (点击全选该目录)'
                    : '未选中 (点击递归全选该目录)'
                  : triState === 'checked'
                  ? '已选中 (点击取消勾选)'
                  : '未选中 (点击勾选)'
              }
            >
              {triState === 'checked' && (
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-blue-500/20" />
              )}
              {triState === 'indeterminate' && (
                <MinusSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-blue-500/20" />
              )}
              {triState === 'unchecked' && (
                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400" />
              )}
            </button>
          ) : (
            <span
              className="w-4 h-4 flex items-center justify-center text-slate-400 dark:text-slate-600 cursor-not-allowed"
              title="已忽略目录无法勾选"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Icon */}
          {node.type === 'directory' ? (
            isNodeBlocked ? (
              <Folder className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
            ) : isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            )
          ) : (
            renderFileIcon()
          )}

          {/* Label / Name */}
          <span className="truncate font-mono text-[11px] leading-tight text-slate-800 dark:text-slate-200">
            {node.name || '(root)'}
          </span>

          {/* Ignored Directory Badge */}
          {node.isIgnored && (
            <span
              className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shrink-0"
              title={node.ignoredReason || '命中忽略规则'}
            >
              已忽略
            </span>
          )}
          {node.isExcluded && (
            <span
              className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shrink-0"
              title={node.excludedReason || '命中目录排除规则'}
            >
              已排除
            </span>
          )}
        </div>

        {/* Right Info: File Size / Directory Children Count */}
        <div className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-2">
          {node.type === 'file' ? (
            <span>{formatBytes(node.size)}</span>
          ) : !isNodeBlocked && node.childrenCount !== undefined ? (
            <span>{node.childrenCount} 项</span>
          ) : null}
        </div>
      </div>

      {/* Children list when expanded */}
      {node.type === 'directory' &&
        !isNodeBlocked &&
        isExpanded &&
        !node.children && (
          <div
            style={{ paddingLeft: `${(depth + 1) * 18 + 12}px` }}
            className="py-1.5 text-[11px] text-slate-400 dark:text-slate-500"
          >
            {isNodeLoading ? '正在读取目录…' : '展开目录以读取内容'}
          </div>
        )}

      {node.type === 'directory' &&
        !isNodeBlocked &&
        isExpanded &&
        node.children && (
          <div className="flex flex-col">
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                settings={settings}
                selectedPaths={selectedPaths}
                selectableCounts={selectableCounts}
                onToggleFile={onToggleFile}
                onToggleFolderRecursive={onToggleFolderRecursive}
                highlightedPath={highlightedPath}
                focusedPath={focusedPath}
                onFocusNode={onFocusNode}
                expandedFolders={expandedFolders}
                onToggleExpandFolder={onToggleExpandFolder}
                onLoadMore={onLoadMore}
                loadingPaths={loadingPaths}
                onContextMenu={onContextMenu}
              />
            ))}

            {/* Large Directory Pagination Footer */}
            {isLargeDirectory && (
              <div
                style={{ paddingLeft: `${(depth + 1) * 18 + 12}px` }}
                className="py-1.5 my-1 mr-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-md flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-3"
              >
                <div className="text-[11px] text-slate-700 dark:text-slate-300">
                  已显示{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {loadedChildren}
                  </span>{' '}
                  项， 共 <span className="font-bold">{totalChildren}</span> 项，
                  剩余{' '}
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {Math.max(0, totalChildren - loadedChildren)}
                  </span>{' '}
                  项
                </div>

                {node.hasMoreChildren ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isNodeLoading}
                    className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium transition-all shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{isNodeLoading ? '正在加载…' : `加载更多 (${Math.min(30, totalChildren - loadedChildren)} 项)`}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    已全部展开加载完毕
                  </span>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
};
