import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import { DEFAULT_SETTINGS } from './data/defaultSettings';
import { loadFolderCopySettings, saveFolderCopySettings } from './data/settingsDatabase';
import {
  FileNode,
  SettingsConfig,
  CopyHistoryItem,
  CopyFailureDetail,
  SelectableFilesResult,
} from './types';
import {
  isFileAllowed,
  findNodeByPath,
  generateContextPackageMarkdown,
  getAncestorPaths,
} from './utils/treeUtils';
import { TitleBar } from './components/common/TitleBar';
import { SystemSettingsModal } from './components/common/SystemSettingsModal';
import { StatePresetBar, DesignStatePreset } from './components/folder-copy/StatePresetBar';
import { TopToolbar } from './components/folder-copy/TopToolbar';
import { SearchBar } from './components/folder-copy/SearchBar';
import { FileTree } from './components/folder-copy/FileTree';
import { SelectionList } from './components/folder-copy/SelectionList';
import { HistoryPanel } from './components/folder-copy/HistoryPanel';
import { AuxiliaryPanel, AuxiliaryView } from './components/folder-copy/AuxiliaryPanel';
import { CopyActionBar } from './components/folder-copy/CopyActionBar';
import { SettingsModal } from './components/folder-copy/SettingsModal';
import { FailureDialog } from './components/folder-copy/FailureDialog';
import { PackagePreviewModal } from './components/folder-copy/PackagePreviewModal';
import { HelpModal } from './components/folder-copy/HelpModal';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  FolderTree,
  FileCheck2,
  History,
} from 'lucide-react';

interface DirectoryPage {
  children: FileNode[];
  totalCount: number;
}

function updateDirectoryNode(
  node: FileNode,
  targetPath: string,
  update: (node: FileNode) => FileNode
): FileNode {
  if (node.path === targetPath) return update(node);
  if (!node.children) return node;

  let changed = false;
  const children = node.children.map((child) => {
    const updated = updateDirectoryNode(child, targetPath, update);
    if (updated !== child) changed = true;
    return updated;
  });
  return changed ? { ...node, children } : node;
}

function normalizeFolderPath(path: string): string {
  return path.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();
}

export default function App() {
  // Folder & Settings State
  const [currentPath, setCurrentPath] = useState('');
  const [recentFolders, setRecentFolders] = useState<string[]>([]);
  const [settings, setSettings] = useState<SettingsConfig>({ ...DEFAULT_SETTINGS });
  const [isSettingsInitialized, setIsSettingsInitialized] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsLoadError, setSettingsLoadError] = useState<string | null>(null);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [rootNode, setRootNode] = useState<FileNode>({
    id: 'root',
    name: '',
    path: '',
    type: 'directory',
  });
  const [isFolderLoaded, setIsFolderLoaded] = useState(false);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const folderLoadVersion = useRef(0);

  // Selection & Tree State
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Map<string, number>>(new Map());
  const [selectableCounts, setSelectableCounts] = useState<Map<string, number>>(new Map());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null);

  // Layout & Auxiliary Panel State (issue 32 resolution)
  // Default design canvas: 1280x800 standard 2/3 : 1/3 split, or narrow window single panel
  const [viewportMode, setViewportMode] = useState<'standard' | 'narrow'>('standard');
  // Initial entry defaults to "当前选择"
  const [auxiliaryView, setAuxiliaryView] = useState<AuxiliaryView>('selection');
  // In narrow mode: single-panel tabs between tree, selection, history
  const [narrowActiveTab, setNarrowActiveTab] = useState<'tree' | 'selection' | 'history'>('tree');

  // History State (FIFO max 20)
  const [historyList, setHistoryList] = useState<CopyHistoryItem[]>([]);

  // Modals & Dialogs
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Page rules settings (whitelist, exclusions, etc.)
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false); // Global system settings (theme, updates, SQLite, etc.)
  const [isFailureDialogOpen, setIsFailureDialogOpen] = useState(false);
  const [failureList, setFailureList] = useState<CopyFailureDetail[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Design State Presets & Overrides for UI evaluation
  const [currentPreset, setCurrentPreset] = useState<DesignStatePreset>('normal');
  const [isFdAvailable, setIsFdAvailable] = useState(true);
  const [isSearchIncomplete, setIsSearchIncomplete] = useState(false);
  const [forcedSearchQuery, setForcedSearchQuery] = useState<string | undefined>(undefined);

  // Toast feedback
  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error' | 'info';
    text: string;
    subText?: string;
  } | null>(null);

  const showToast = useCallback(
    (type: 'success' | 'error' | 'info', text: string, subText?: string) => {
      setToast({ id: Date.now(), type, text, subText });
      setTimeout(() => {
        setToast((curr) => (curr?.text === text ? null : curr));
      }, 3500);
    },
    []
  );

  const loadFolder = useCallback(async (targetPath: string, requestedSettings?: SettingsConfig) => {
    const requestedPath = targetPath.trim();
    if (!requestedPath) {
      showToast('error', '路径不能为空', '请输入有效的文件夹完整路径');
      return false;
    }

    const requestVersion = ++folderLoadVersion.current;
    setIsLoadingFolder(true);
    try {
      let activeSettings = requestedSettings ?? settings;
      if (!requestedSettings && !isSettingsInitialized) {
        try {
          activeSettings = await loadFolderCopySettings();
        } catch (error) {
          showToast('error', '无法加载文件规则设置', String(error));
          return false;
        }
        setSettings(activeSettings);
        setIsSettingsInitialized(true);
      }
      const tree = await invoke<FileNode>('load_directory_tree', {
        rootPath: requestedPath,
        settings: activeSettings,
      });
      if (requestVersion !== folderLoadVersion.current) return;

      const sameFolder = normalizeFolderPath(currentPath) === normalizeFolderPath(requestedPath);
      setCurrentPath(requestedPath);
      setRootNode(tree);
      setIsFolderLoaded(true);
      setExpandedFolders(new Set());
      setHighlightedPath(null);
      setLoadingPaths(new Set());
      if (!sameFolder) {
        setSelectedPaths(new Set());
        setSelectedSizes(new Map());
        setSelectableCounts(new Map());
      }
      setRecentFolders((previous) =>
        [requestedPath, ...previous.filter((path) => normalizeFolderPath(path) !== normalizeFolderPath(requestedPath))].slice(0, 10)
      );
      showToast('success', sameFolder ? '已重新载入文件夹' : '已加载指定文件夹', requestedPath);
      return true;
    } catch (error) {
      if (requestVersion === folderLoadVersion.current) {
        showToast('error', '无法读取该文件夹', String(error));
      }
      return false;
    } finally {
      if (requestVersion === folderLoadVersion.current) setIsLoadingFolder(false);
    }
  }, [currentPath, isSettingsInitialized, settings, showToast]);

  const handleLoadSettings = async () => {
    setIsSettingsLoading(true);
    setSettingsLoadError(null);
    try {
      const savedSettings = await loadFolderCopySettings();
      setSettings(savedSettings);
      setIsSettingsInitialized(true);
    } catch (error) {
      setSettingsLoadError(String(error));
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
    void handleLoadSettings();
  };

  // Preset switching logic
  const handleSelectPreset = (preset: DesignStatePreset) => {
    setCurrentPreset(preset);
    setIsFailureDialogOpen(false);
    setIsSettingsOpen(false);
    setIsPreviewOpen(false);

    switch (preset) {
      case 'normal':
        setIsFdAvailable(true);
        setIsSearchIncomplete(false);
        setForcedSearchQuery('');
        setSelectedPaths(new Set());
        setSelectedSizes(new Map());
        setSelectableCounts(new Map());
        setExpandedFolders(new Set());
        setAuxiliaryView('selection');
        setNarrowActiveTab('tree');
        break;

      case 'search_over10':
        setIsFdAvailable(true);
        setIsSearchIncomplete(false);
        setForcedSearchQuery('icon');
        break;

      case 'search_empty':
        setIsFdAvailable(true);
        setIsSearchIncomplete(false);
        setForcedSearchQuery('non_existent_xyz_file');
        break;

      case 'search_fd_missing':
        setIsFdAvailable(false);
        setIsSearchIncomplete(false);
        setForcedSearchQuery('');
        break;

      case 'search_incomplete':
        setIsFdAvailable(true);
        setIsSearchIncomplete(true);
        setForcedSearchQuery('core');
        break;

      case 'empty_selection':
        setIsFdAvailable(true);
        setIsSearchIncomplete(false);
        setSelectedPaths(new Set());
        setSelectedSizes(new Map());
        setSelectableCounts(new Map());
        setAuxiliaryView('selection');
        if (viewportMode === 'narrow') setNarrowActiveTab('selection');
        showToast('info', '已切换到空选择态', '复制文件上下文包按钮已根据规范禁用');
        break;

      case 'empty_folder':
        setIsFdAvailable(true);
        setIsSearchIncomplete(false);
        setSelectedPaths(new Set());
        setSelectedSizes(new Map());
        setSelectableCounts(new Map());
        if (viewportMode === 'narrow') setNarrowActiveTab('tree');
        showToast('info', '已清空当前选择', '目录内容仍来自当前真实文件夹');
        break;

      case 'empty_history':
        setHistoryList([]);
        setAuxiliaryView('history');
        if (viewportMode === 'narrow') setNarrowActiveTab('history');
        showToast('info', '已切换到无历史记录状态', '展示无历史记录时的明确空状态');
        break;

      case 'large_dir':
        setIsFdAvailable(true);
        setIsSearchIncomplete(false);
        setExpandedFolders(new Set());
        if (viewportMode === 'narrow') setNarrowActiveTab('tree');
        showToast('info', '大目录分页使用真实目录数据', '选择包含超过 50 个直接子项的目录进行验收');
        break;

      case 'copy_failure_dialog':
        setFailureList([
          {
            filePath: `${currentPath}\\src\\core\\scanner.ts`,
            reason: '文件正被另一后台进程独占访问 (EBUSY: resource busy or locked)',
            code: 'EBUSY',
          },
          {
            filePath: `${currentPath}\\src\\core\\sqlite-storage.ts`,
            reason: '当前系统用户缺少对该文件的读取权限 (EACCES: permission denied)',
            code: 'EACCES',
          },
        ]);
        setIsFailureDialogOpen(true);
        break;

      case 'history_partial_fail':
        showToast('info', '正在模拟读取历史记录当前文件...', '演示部分文件丢失时的容错替换');
        setTimeout(() => {
          handleReReadFile(historyList[0], true);
        }, 300);
        break;

      case 'settings_open':
        handleOpenSettings();
        break;

      case 'copy_single_file':
        setIsFdAvailable(true);
        setIsSearchIncomplete(false);
        showToast('info', '请从当前真实文件树选择文件', '该状态预设不会加载模拟目录');
        break;
    }
  };

  // Keyboard shortcut listener for Ctrl+Shift+C
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (selectedPaths.size > 0) {
          handleExecuteCopy();
        } else {
          showToast('error', '无任何勾选文件', '请至少勾选一个文件后再复制');
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedPaths, rootNode, currentPath]);

  // Toggle single file selection
  const handleToggleFileSelect = (path: string) => {
    const node = findNodeByPath(rootNode, path);
    const isSelected = selectedPaths.has(path);
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(path);
      else next.add(path);
      return next;
    });
    setSelectedSizes((sizes) => {
      const updated = new Map(sizes);
      if (isSelected) updated.delete(path);
      else updated.set(path, node?.size ?? 0);
      return updated;
    });
  };

  // Recursive toggle for folder (all selectable valid files)
  const handleToggleFolderRecursive = async (node: FileNode, shouldSelect: boolean) => {
    if (!currentPath) return;
    const requestVersion = folderLoadVersion.current;
    try {
      const result = await invoke<SelectableFilesResult>('list_selectable_files', {
        rootPath: currentPath,
        relativePath: node.path,
        settings,
      });
      if (requestVersion !== folderLoadVersion.current) return;
      const validFiles = result.files;
      setSelectedPaths((previous) => {
        const next = new Set(previous);
        if (shouldSelect) {
          validFiles.forEach((file) => next.add(file.path));
        } else validFiles.forEach((file) => next.delete(file.path));
        return next;
      });
      setSelectedSizes((previous) => {
        const sizes = new Map(previous);
        if (shouldSelect) validFiles.forEach((file) => sizes.set(file.path, file.size));
        else validFiles.forEach((file) => sizes.delete(file.path));
        return sizes;
      });
      setSelectableCounts((previous) => {
        const counts = new Map(previous);
        result.directoryCounts.forEach(({ path, count }) => counts.set(path, count));
        return counts;
      });
    } catch (error) {
      showToast('error', '无法递归读取目录文件', String(error));
    }
  };

  // Expand a directory lazily, fetching its first page only when needed.
  const handleToggleExpandFolder = async (path: string) => {
    const node = findNodeByPath(rootNode, path);
    if (!node || node.type !== 'directory' || node.isIgnored || node.isExcluded) return;

    if (expandedFolders.has(path)) {
      setExpandedFolders((previous) => {
        const next = new Set(previous);
        next.delete(path);
        return next;
      });
      return;
    }

    setExpandedFolders((previous) => new Set(previous).add(path));
    if (node.children !== undefined || !currentPath || loadingPaths.has(path)) return;

    const requestVersion = folderLoadVersion.current;
    setLoadingPaths((previous) => new Set(previous).add(path));
    try {
      const page = await invoke<DirectoryPage>('load_directory_page', {
        rootPath: currentPath,
        relativePath: path,
        offset: 0,
        settings,
      });
      if (requestVersion !== folderLoadVersion.current) return;
      setRootNode((root) => updateDirectoryNode(root, path, (directory) => ({
        ...directory,
        children: page.children,
        childrenCount: page.totalCount,
        hasMoreChildren: page.totalCount > page.children.length,
      })));
    } catch (error) {
      showToast('error', '无法读取子目录', String(error));
      setExpandedFolders((previous) => {
        const next = new Set(previous);
        next.delete(path);
        return next;
      });
    } finally {
      setLoadingPaths((previous) => {
        const next = new Set(previous);
        next.delete(path);
        return next;
      });
    }
  };

  const handleLoadMoreChildren = async (path: string) => {
    const directory = findNodeByPath(rootNode, path);
    if (!directory || directory.type !== 'directory' || !directory.hasMoreChildren || loadingPaths.has(path)) return;
    const offset = directory.children?.length ?? 0;
    const requestVersion = folderLoadVersion.current;
    setLoadingPaths((previous) => new Set(previous).add(path));
    try {
      const page = await invoke<DirectoryPage>('load_directory_page', {
        rootPath: currentPath,
        relativePath: path,
        offset,
        settings,
      });
      if (requestVersion !== folderLoadVersion.current) return;
      setRootNode((root) => updateDirectoryNode(root, path, (current) => {
        const children = [...(current.children ?? []), ...page.children];
        return {
          ...current,
          children,
          childrenCount: page.totalCount,
          hasMoreChildren: children.length < page.totalCount,
        };
      }));
    } catch (error) {
      showToast('error', '无法加载更多目录项', String(error));
    } finally {
      setLoadingPaths((previous) => {
        const next = new Set(previous);
        next.delete(path);
        return next;
      });
    }
  };

  // Expand all currently loaded folders and fetch one visible page for each.
  const handleExpandAllFolders = () => {
    const allFolderPaths: string[] = [];
    const foldersNeedingLoad: string[] = [];
    const traverse = (node: FileNode) => {
      if (node.type === 'directory' && !node.isIgnored && !node.isExcluded) {
        if (node.path) allFolderPaths.push(node.path);
        if (node.path && node.children === undefined) foldersNeedingLoad.push(node.path);
        node.children?.forEach(traverse);
      }
    };
    traverse(rootNode);
    setExpandedFolders(new Set(allFolderPaths));
    foldersNeedingLoad
      .filter((path) => !expandedFolders.has(path))
      .forEach((path) => void handleToggleExpandFolder(path));
    showToast('info', `已展开全部目录 (${allFolderPaths.length} 个)`);
  };

  // Batch Collapse all folders
  const handleCollapseAllFolders = () => {
    setExpandedFolders(new Set());
    showToast('info', '已折叠全部目录');
  };

  // Batch Select all valid allowed files in tree
  const handleSelectAllAllowedFiles = async () => {
    if (!currentPath) return;
    const requestVersion = folderLoadVersion.current;
    try {
      const result = await invoke<SelectableFilesResult>('list_selectable_files', {
        rootPath: currentPath,
        relativePath: '',
        settings,
      });
      if (requestVersion !== folderLoadVersion.current) return;
      setSelectedPaths(new Set(result.files.map((file) => file.path)));
      setSelectedSizes(new Map(result.files.map((file) => [file.path, file.size])));
      setSelectableCounts(new Map(result.directoryCounts.map(({ path, count }) => [path, count])));
      showToast('success', `已全选符合规则的文件 (共 ${result.files.length} 个)`);
    } catch (error) {
      showToast('error', '无法全选符合规则的文件', String(error));
    }
  };

  // Locate node in tree and expand all ancestors
  const handleLocateNodeInTree = (path: string, isFolder: boolean) => {
    const ancestors = getAncestorPaths(path);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      ancestors.forEach((a) => next.add(a));
      if (isFolder) next.add(path);
      return next;
    });
    setHighlightedPath(path);
    if (viewportMode === 'narrow') {
      setNarrowActiveTab('tree');
    }
    setTimeout(() => {
      setHighlightedPath((curr) => (curr === path ? null : curr));
    }, 2800);
  };

  // Remove single path from selection list (issue 32: sync tree & count)
  const handleRemoveSelectedPath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
    setSelectedSizes((previous) => {
      const next = new Map(previous);
      next.delete(path);
      return next;
    });
  };

  // Clear all selections
  const handleClearAllSelections = () => {
    setSelectedPaths(new Set());
    setSelectedSizes(new Map());
    showToast('info', '已清空全部所选文件');
  };

  // Use Tauri's native system folder picker.
  const handleOpenFolderDialog = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        defaultPath: currentPath || undefined,
      });
      if (typeof selectedPath === 'string') await loadFolder(selectedPath);
    } catch (error) {
      showToast('error', '无法打开文件夹选择器', String(error));
    }
  };

  const handleRefreshFolder = (targetPath: string) => {
    loadFolder(targetPath.trim() || currentPath);
  };

  const handleSelectRecentFolder = (folderPath: string) => {
    loadFolder(folderPath);
  };

  const handleManualChangePath = (newPath: string) => {
    loadFolder(newPath);
  };

  // Preview generated package markdown
  const handlePreviewPackage = () => {
    const selectedArr = Array.from(selectedPaths);
    const md = generateContextPackageMarkdown(currentPath, selectedArr, rootNode);
    setPreviewMarkdown(md);
    setIsPreviewOpen(true);
  };

  // Execute Copy package (Requirement: copy button disabled when 0 selected, short success toast)
  const handleExecuteCopy = () => {
    if (selectedPaths.size === 0) return;

    setIsCopying(true);

    if (currentPreset === 'copy_failure_dialog') {
      setTimeout(() => {
        setIsCopying(false);
        setFailureList([
          {
            filePath: `${currentPath}\\src\\core\\scanner.ts`,
            reason: '文件已被另一后台进程独占锁定 (EBUSY: resource busy or locked)',
            code: 'EBUSY',
          },
          {
            filePath: `${currentPath}\\src\\core\\sqlite-storage.ts`,
            reason: '当前系统用户缺少对该文件的读取权限 (EACCES: permission denied)',
            code: 'EACCES',
          },
        ]);
        setIsFailureDialogOpen(true);
      }, 400);
      return;
    }

    setTimeout(() => {
      setIsCopying(false);
      const selectedArr = Array.from(selectedPaths);
      const md = generateContextPackageMarkdown(currentPath, selectedArr, rootNode);

      navigator.clipboard.writeText(md);

      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const newHistoryItem: CopyHistoryItem = {
        id: `hist-${Date.now()}`,
        createdAt: timeStr,
        timestamp: Date.now(),
        sourceFolder: currentPath,
        fileCount: selectedArr.length,
        filePaths: selectedArr,
        packageSnapshot: md,
      };

      setHistoryList((prev) => {
        const next = [newHistoryItem, ...prev];
        return next.slice(0, 20);
      });

      showToast(
        'success',
        `已复制文件上下文包到剪贴板！`,
        `共 ${selectedArr.length} 个文件，已加入复制历史`
      );
    }, 350);
  };

  // History Action 1: Copy saved snapshot directly
  const handleCopyHistorySnapshot = (item: CopyHistoryItem) => {
    navigator.clipboard.writeText(item.packageSnapshot);
    showToast(
      'success',
      '已复制保存的历史快照',
      `未重新扫描磁盘，保持 ${item.createdAt} 历史状态`
    );
  };

  // History Action 2: Re-read current files
  const handleReReadFile = (item: CopyHistoryItem, forcePartialFail = false) => {
    if (forcePartialFail) {
      const failedPath = item.filePaths[item.filePaths.length - 1];
      const successPaths = item.filePaths.slice(0, -1);

      if (successPaths.length > 0) {
        const md = generateContextPackageMarkdown(item.sourceFolder, successPaths, rootNode);
        navigator.clipboard.writeText(md);

        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        const updatedItem: CopyHistoryItem = {
          ...item,
          id: `hist-reread-${Date.now()}`,
          createdAt: timeStr,
          timestamp: Date.now(),
          fileCount: successPaths.length,
          filePaths: successPaths,
          packageSnapshot: md,
        };

        setHistoryList((prev) => prev.map((h) => (h.id === item.id ? updatedItem : h)));

        showToast(
          'info',
          `重读部分成功：已复制 ${successPaths.length} 个有效文件`,
          `失败项：${failedPath} (文件不存在或已被删除)，已用新快照替换历史记录`
        );
      } else {
        showToast(
          'error',
          '重读全部失败',
          '所有文件均不可读取，已保留原历史快照与剪贴板不变'
        );
      }
    } else {
      const md = generateContextPackageMarkdown(item.sourceFolder, item.filePaths, rootNode);
      navigator.clipboard.writeText(md);

      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const updatedItem: CopyHistoryItem = {
        ...item,
        id: `hist-reread-${Date.now()}`,
        createdAt: timeStr,
        timestamp: Date.now(),
        packageSnapshot: md,
      };

      setHistoryList((prev) => prev.map((h) => (h.id === item.id ? updatedItem : h)));

      showToast(
        'success',
        `已从磁盘重新读取 ${item.filePaths.length} 个当前文件并复制到剪贴板！`,
        '已更新并刷新该条历史记录时间戳'
      );
    }
  };

  // History Action 3: Delete history item
  const handleDeleteHistory = (id: string) => {
    setHistoryList((prev) => prev.filter((h) => h.id !== id));
    showToast('info', '已删除该条历史记录');
  };

  // View historical package snapshot modal
  const handleViewHistoricalSnapshot = (item: CopyHistoryItem) => {
    setPreviewMarkdown(item.packageSnapshot);
    setIsPreviewOpen(true);
  };

  // Right-click action: "仅复制当前文件" (Resolved grilling rule)
  // Generates single-file context package, adds 1 history item, does NOT change selectedPaths!
  const handleCopySingleFile = (node: FileNode) => {
    const md = generateContextPackageMarkdown(currentPath, [node.path], rootNode);

    navigator.clipboard.writeText(md);

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newHistoryItem: CopyHistoryItem = {
      id: `hist-single-${Date.now()}`,
      createdAt: timeStr,
      timestamp: Date.now(),
      sourceFolder: currentPath,
      fileCount: 1,
      filePaths: [node.path],
      packageSnapshot: md,
    };

    setHistoryList((prev) => {
      const next = [newHistoryItem, ...prev];
      return next.slice(0, 20);
    });

    // Operates without changing any existing file or folder selection states
    showToast(
      'success',
      `已复制单文件上下文包 (仅当前文件: ${node.name})`,
      `不改变已有的 ${selectedPaths.size} 个选择状态，已按普通复制存入历史`
    );
  };

  const handleRevealNodeInFileManager = async (node: FileNode) => {
    const absoluteNodePath = `${currentPath.replace(/[\\/]+$/, '')}\\${node.path.replace(/\//g, '\\')}`;
    try {
      if (node.type === 'file') {
        await revealItemInDir(absoluteNodePath);
      } else {
        await openPath(absoluteNodePath);
      }
    } catch (error) {
      showToast(
        'error',
        '无法在文件资源管理器中显示',
        `${absoluteNodePath}\n${String(error)}`
      );
    }
  };

  // Save Settings to SQLite
  const handleSaveSettings = async (newSettings: SettingsConfig): Promise<boolean> => {
    setIsSettingsSaving(true);
    try {
      let refreshedTree: FileNode | null = null;
      if (currentPath) {
        setIsLoadingFolder(true);
        try {
          refreshedTree = await invoke<FileNode>('load_directory_tree', {
            rootPath: currentPath,
            settings: newSettings,
          });
        } finally {
          setIsLoadingFolder(false);
        }
      }

      await saveFolderCopySettings(newSettings);
      if (refreshedTree) {
        setRootNode(refreshedTree);
        setExpandedFolders(new Set());
        setHighlightedPath(null);
        setLoadingPaths(new Set());
        setSelectedPaths((previous) => {
          const remaining = [...previous].filter((relativePath) => {
            const filename = relativePath.split(/[\\/]/).pop() ?? relativePath;
            return isFileAllowed(filename, relativePath, newSettings);
          });
          return new Set(remaining);
        });
        setSelectedSizes((previous) => {
          const remaining = new Map(previous);
          for (const path of remaining.keys()) {
            const filename = path.split(/[\\/]/).pop() ?? path;
            if (!isFileAllowed(filename, path, newSettings)) remaining.delete(path);
          }
          return remaining;
        });
        setSelectableCounts(new Map());
      }
      if (currentPath) {
        setIsFolderLoaded(true);
        showToast('success', '设置已保存并应用到当前目录', currentPath);
      } else {
        showToast(
          'success',
          '设置已保存至 SQLite',
          `大目录阈值: ${newSettings.largeDirThreshold} | 白名单: ${newSettings.whitelist.length} 项`
        );
      }
      setSettings(newSettings);
      return true;
    } finally {
      setIsSettingsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-150">
      {/* 1. Windows Native Title Bar: Native window title + Global System Settings button beside Minimize */}
      <TitleBar onOpenSettings={() => setIsSystemSettingsOpen(true)} />

      {/* 2. Interactive Design State & Viewport Switcher */}
      <StatePresetBar
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        showHelp={isHelpOpen}
        onToggleHelp={() => setIsHelpOpen(!isHelpOpen)}
        viewportMode={viewportMode}
        onToggleViewportMode={setViewportMode}
      />

      {/* 3. Top Utility Bar: Navigation Bar & Combobox (地址输入框在左，选择文件夹、重新载入、规则设置在输入框右侧) */}
      <TopToolbar
        currentPath={currentPath}
        onChangePath={handleManualChangePath}
        onRefreshFolder={handleRefreshFolder}
        onOpenPageSettings={handleOpenSettings}
        recentFolders={recentFolders}
        onSelectRecentFolder={handleSelectRecentFolder}
        onOpenFolderDialog={handleOpenFolderDialog}
        isLoadingFolder={isLoadingFolder}
      />

      {/* 4. Search Area: Single Dedicated Row (搜索输入框单独占一行) */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <SearchBar
          rootNode={rootNode}
          settings={settings}
          selectedPaths={selectedPaths}
          onToggleFileSelect={handleToggleFileSelect}
          onLocateNodeInTree={handleLocateNodeInTree}
          isFdAvailable={isFdAvailable}
          isSearchIncomplete={isSearchIncomplete}
          forcedQuery={forcedSearchQuery}
        />
      </div>

      {/* 5. Main Work Area: Supports Standard 2/3 : 1/3 Split OR Narrow Single Panel Switch */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3 bg-slate-100 dark:bg-slate-950 transition-colors duration-150">
        {viewportMode === 'standard' ? (
          /* STANDARD 1280x800 BASELINE LAYOUT: 2/3 File Tree + 1/3 Auxiliary Panel */
          <>
            {/* Left Column: File Tree (~2/3, flex-[2]) */}
            <div className="flex-[2] min-w-0 flex flex-col bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <FolderTree className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <span>文件树浏览 (约占 2/3)</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
                  <span>分页阈值: {settings.largeDirThreshold}</span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <FileTree
                  rootNode={rootNode}
                  currentFolderPath={currentPath}
                  isFolderLoaded={isFolderLoaded}
                  isLoadingFolder={isLoadingFolder}
                  loadingPaths={loadingPaths}
                  settings={settings}
                  selectedPaths={selectedPaths}
                  selectableCounts={selectableCounts}
                  onToggleFile={handleToggleFileSelect}
                  onToggleFolderRecursive={handleToggleFolderRecursive}
                  highlightedPath={highlightedPath}
                  expandedFolders={expandedFolders}
                  onToggleExpandFolder={handleToggleExpandFolder}
                  onLoadMore={handleLoadMoreChildren}
                  onCopySingleFile={handleCopySingleFile}
                  onRevealNodeInFileManager={handleRevealNodeInFileManager}
                  onExpandAll={handleExpandAllFolders}
                  onCollapseAll={handleCollapseAllFolders}
                  onSelectAllValid={handleSelectAllAllowedFiles}
                  onClearAll={handleClearAllSelections}
                />
              </div>
            </div>

            {/* Right Column: Auxiliary Panel (~1/3, flex-1) with Tabs: 当前选择 vs 复制历史 */}
            <div className="flex-1 min-w-0">
              <AuxiliaryPanel
                activeView={auxiliaryView}
                onChangeView={setAuxiliaryView}
                selectedPaths={selectedPaths}
                selectedSizes={selectedSizes}
                rootNode={rootNode}
                onRemovePath={handleRemoveSelectedPath}
                onClearAll={handleClearAllSelections}
                onLocateInTree={(p) => handleLocateNodeInTree(p, false)}
                onPreviewPackage={handlePreviewPackage}
                historyList={historyList}
                currentFolderPath={currentPath}
                onCopySnapshot={handleCopyHistorySnapshot}
                onReReadFile={handleReReadFile}
                onDeleteHistory={handleDeleteHistory}
                onViewSnapshot={handleViewHistoricalSnapshot}
              />
            </div>
          </>
        ) : (
          /* NARROW WINDOW ADAPTATION: Single Panel Switch (文件树 / 当前选择 / 复制历史) */
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
            {/* Narrow Window 3-tab Bar */}
            <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-3 pt-1 flex items-center justify-between shrink-0">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setNarrowActiveTab('tree')}
                  className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-semibold transition-all cursor-pointer ${
                    narrowActiveTab === 'tree'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900/60 rounded-t'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>文件树</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNarrowActiveTab('selection')}
                  className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-semibold transition-all cursor-pointer ${
                    narrowActiveTab === 'selection'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900/60 rounded-t'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>当前选择</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      narrowActiveTab === 'selection'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {selectedPaths.size}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNarrowActiveTab('history')}
                  className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-semibold transition-all cursor-pointer ${
                    narrowActiveTab === 'history'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900/60 rounded-t'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>复制历史</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      narrowActiveTab === 'history'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {historyList.length}
                  </span>
                </button>
              </div>

              <span className="text-[10px] text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40 font-mono">
                窄窗口单面板模式
              </span>
            </div>

            {/* Narrow Tab Body */}
            <div className="flex-1 overflow-hidden">
              {narrowActiveTab === 'tree' && (
                <FileTree
                  rootNode={rootNode}
                  currentFolderPath={currentPath}
                  isFolderLoaded={isFolderLoaded}
                  isLoadingFolder={isLoadingFolder}
                  loadingPaths={loadingPaths}
                  settings={settings}
                  selectedPaths={selectedPaths}
                  selectableCounts={selectableCounts}
                  onToggleFile={handleToggleFileSelect}
                  onToggleFolderRecursive={handleToggleFolderRecursive}
                  highlightedPath={highlightedPath}
                  expandedFolders={expandedFolders}
                  onToggleExpandFolder={handleToggleExpandFolder}
                  onLoadMore={handleLoadMoreChildren}
                  onCopySingleFile={handleCopySingleFile}
                  onRevealNodeInFileManager={handleRevealNodeInFileManager}
                  onExpandAll={handleExpandAllFolders}
                  onCollapseAll={handleCollapseAllFolders}
                  onSelectAllValid={handleSelectAllAllowedFiles}
                  onClearAll={handleClearAllSelections}
                />
              )}

              {narrowActiveTab === 'selection' && (
                <SelectionList
                  selectedPaths={selectedPaths}
                  selectedSizes={selectedSizes}
                  rootNode={rootNode}
                  onRemovePath={handleRemoveSelectedPath}
                  onClearAll={handleClearAllSelections}
                  onLocateInTree={(p) => handleLocateNodeInTree(p, false)}
                  onPreviewPackage={handlePreviewPackage}
                />
              )}

              {narrowActiveTab === 'history' && (
                <HistoryPanel
                  historyList={historyList}
                  currentFolderPath={currentPath}
                  onCopySnapshot={handleCopyHistorySnapshot}
                  onReReadFile={handleReReadFile}
                  onDeleteHistory={handleDeleteHistory}
                  onViewSnapshot={handleViewHistoricalSnapshot}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Section 3.4: Fixed Bottom Copy Action Bar */}
      <CopyActionBar
        selectedCount={selectedPaths.size}
        onExecuteCopy={handleExecuteCopy}
        isCopying={isCopying}
      />

      {/* 7. Page Rules Settings Modal: Whitelist, Exclusions, Ignored Dirs, Positive Integer Threshold */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setSettingsLoadError(null);
        }}
        currentSettings={settings}
        onSaveSettings={handleSaveSettings}
        isSettingsLoading={isSettingsLoading}
        settingsLoadError={settingsLoadError}
        onRetryLoadSettings={handleLoadSettings}
        isSqliteSaving={isSettingsSaving}
      />

      {/* 7.1 Global System Settings Modal: Theme, Software Updates, SQLite Status, System Shortcuts */}
      <SystemSettingsModal
        isOpen={isSystemSettingsOpen}
        onClose={() => setIsSystemSettingsOpen(false)}
      />

      {/* 8. Copy Failure Dialog: Lists Failed File Paths and Reasons, Retains Selections */}
      <FailureDialog
        isOpen={isFailureDialogOpen}
        onClose={() => setIsFailureDialogOpen(false)}
        failures={failureList}
        onRetry={() => {
          setIsFailureDialogOpen(false);
          handleExecuteCopy();
        }}
        onExcludeFailedAndRetry={(failedPaths) => {
          setSelectedPaths((prev) => {
            const next = new Set(prev);
            failedPaths.forEach((fp) => {
              const rel = fp.replace(currentPath + '\\', '').replace(/\\/g, '/');
              next.delete(rel);
            });
            return next;
          });
          setSelectedSizes((previous) => {
            const next = new Map(previous);
            failedPaths.forEach((fp) => next.delete(fp.replace(currentPath + '\\', '').replace(/\\/g, '/')));
            return next;
          });
          setIsFailureDialogOpen(false);
          showToast('info', '已剔除失效项并继续');
          setTimeout(() => handleExecuteCopy(), 200);
        }}
      />

      {/* 9. Context Package Preview Modal */}
      <PackagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        markdownContent={previewMarkdown}
        fileCount={selectedPaths.size}
      />

      {/* 10. Rules & Specs Reference Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-14 right-5 z-50 flex items-start space-x-2.5 px-4 py-2.5 rounded-lg shadow-2xl border text-xs max-w-md animate-in slide-in-from-bottom-3 duration-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
          {toast.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{toast.text}</div>
            {toast.subText && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {toast.subText}
              </div>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
