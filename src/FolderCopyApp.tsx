import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { DEFAULT_SETTINGS } from './data/defaultSettings';
import { loadFolderCopySettings, saveFolderCopySettings } from './data/settingsDatabase';
import { checkFdAvailable } from './data/searchBackend';
import {
  RECENT_FOLDER_LIMIT,
  forgetRecentFolder,
  loadRecentFolders,
  touchRecentFolder,
} from './data/recentFolders';
import {
  FileNode,
  SettingsConfig,
  CopyHistoryItem,
  CopyFailureDetail,
  ContextPackageError,
  HistoryListResult,
  RefreshedPackage,
  SelectableFile,
  SelectableFilesResult,
} from './types';
import {
  isFileAllowed,
  findNodeByPath,
  getAncestorPaths,
  normalizeFolderPath,
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

// 历史元数据只带 Unix 毫秒，落盘与显示同源（issue 48）
function formatHistoryTime(createdAt: number): string {
  return new Date(createdAt).toLocaleString('zh-CN');
}

function asPackageError(error: unknown): ContextPackageError | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    Array.isArray((error as ContextPackageError).failures)
  ) {
    return error as ContextPackageError;
  }
  return null;
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

// 首页加载与分页追加共用同一形状：children 为 undefined 时即首页
function appendDirectoryPage(node: FileNode, page: DirectoryPage): FileNode {
  const children = [...(node.children ?? []), ...page.children];
  return {
    ...node,
    children,
    childrenCount: page.totalCount,
    hasMoreChildren: children.length < page.totalCount,
  };
}

type FolderLoadOutcome = 'loaded' | 'rejected' | 'unreadable';

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
  const historyWarningShown = useRef(false);

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

  // History State（落盘见 issue 48；列表由 list_history 读出）
  const [historyList, setHistoryList] = useState<CopyHistoryItem[]>([]);
  // 状态预设只演示无历史时的空界面，不得伪造或删除真实历史
  const [presetEmptyHistory, setPresetEmptyHistory] = useState(false);
  const visibleHistoryList = presetEmptyHistory ? [] : historyList;

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
  // fd 可用性来自真实检测，不再由状态预设伪造
  const [isFdAvailable, setIsFdAvailable] = useState(true);
  const [presetSearchQuery, setPresetSearchQuery] = useState<string | undefined>(undefined);

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

  useEffect(() => {
    void loadRecentFolders()
      .then(setRecentFolders)
      .catch((error) => showToast('error', '无法读取最近文件夹', String(error)));
  }, [showToast]);

  const recheckFd = useCallback(() => {
    void checkFdAvailable()
      .then(setIsFdAvailable)
      .catch(() => setIsFdAvailable(false));
  }, []);

  useEffect(() => {
    recheckFd();
  }, [recheckFd]);

  // 包正文一律由 Rust 按真实磁盘内容生成，前端不再伪造文件内容
  const buildContextPackage = useCallback(
    (rootPath: string, relativePaths: string[]) =>
      invoke<string>('generate_context_package', { rootPath, relativePaths, settings }),
    [settings]
  );

  // 生成失败时按后端语义展示失败明细；无明细的异常退化为普通错误提示
  const reportPackageError = useCallback(
    (error: unknown, title: string) => {
      const packageError = asPackageError(error);
      if (packageError) {
        setFailureList(packageError.failures);
        setIsFailureDialogOpen(true);
        return;
      }
      showToast('error', title, String(error));
    },
    [showToast]
  );

  // 剪贴板写入必须先确认结果：失败则不创建历史、不提示成功
  const copyToClipboard = useCallback(
    async (markdown: string): Promise<boolean> => {
      try {
        await writeText(markdown);
        return true;
      } catch (error) {
        showToast('error', '剪贴板写入失败，未创建复制历史', String(error));
        return false;
      }
    },
    [showToast]
  );

  // 历史列表是磁盘事实的投影：每次写入后重新读取，前端不自己拼列表
  const refreshHistory = useCallback(async (): Promise<CopyHistoryItem[]> => {
    let result: HistoryListResult;
    try {
      result = await invoke<HistoryListResult>('list_history');
    } catch (error) {
      setHistoryList([]);
      if (!historyWarningShown.current) {
        historyWarningShown.current = true;
        showToast('error', '无法读取复制历史', String(error));
      }
      return [];
    }
    setHistoryList(result.records);
    if (result.warning && !historyWarningShown.current) {
      historyWarningShown.current = true;
      showToast('error', '复制历史读取异常', result.warning);
    }
    return result.records;
  }, [showToast]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  // issue 48：正文已交付剪贴板无法回滚，写盘失败只单独提示，并且该条不进入历史列表
  const persistHistory = useCallback(
    async (sourceFolder: string, filePaths: string[], markdown: string): Promise<boolean> => {
      try {
        await invoke('save_history', { sourceFolder, filePaths, markdown });
      } catch (error) {
        showToast(
          'error',
          '复制成功，但该条历史未能保存',
          `${String(error)}\n重启后这条记录不会出现在复制历史中。`
        );
        return false;
      }
      await refreshHistory();
      return true;
    },
    [refreshHistory, showToast]
  );

  // ADR-0001 / issue 43：加载目录后以该目录最新历史为参考恢复选择，失效项由 Rust 静默过滤
  const restoreSelectionFromHistory = useCallback(
    async (folderPath: string, activeSettings: SettingsConfig, requestVersion: number) => {
      const records = await refreshHistory();
      const latest = records.find(
        (record) =>
          normalizeFolderPath(record.sourceFolder) === normalizeFolderPath(folderPath)
      );
      if (!latest || requestVersion !== folderLoadVersion.current) return;

      try {
        const survivors = await invoke<SelectableFile[]>('filter_selectable_paths', {
          rootPath: folderPath,
          relativePaths: latest.filePaths,
          settings: activeSettings,
        });
        if (requestVersion !== folderLoadVersion.current || survivors.length === 0) return;
        setSelectedPaths(new Set(survivors.map((file) => file.path)));
        setSelectedSizes(new Map(survivors.map((file) => [file.path, file.size])));
      } catch (error) {
        showToast('error', '无法恢复上次复制的文件选择', String(error));
      }
    },
    [refreshHistory, showToast]
  );

  const loadFolder = useCallback(async (targetPath: string, requestedSettings?: SettingsConfig): Promise<FolderLoadOutcome> => {
    const requestedPath = targetPath.trim();
    if (!requestedPath) {
      showToast('error', '路径不能为空', '请输入有效的文件夹完整路径');
      return 'rejected';
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
          return 'rejected';
        }
        setSettings(activeSettings);
        setIsSettingsInitialized(true);
      }
      const tree = await invoke<FileNode>('load_directory_tree', {
        rootPath: requestedPath,
        settings: activeSettings,
      });
      if (requestVersion !== folderLoadVersion.current) return 'rejected';

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
        void restoreSelectionFromHistory(requestedPath, activeSettings, requestVersion);
      }
      setRecentFolders((previous) =>
        [requestedPath, ...previous.filter((path) => normalizeFolderPath(path) !== normalizeFolderPath(requestedPath))].slice(0, RECENT_FOLDER_LIMIT)
      );
      void touchRecentFolder(requestedPath).catch((error) =>
        showToast('error', '最近文件夹未能写入数据库，仅本次运行有效', String(error))
      );
      showToast('success', sameFolder ? '已重新载入文件夹' : '已加载指定文件夹', requestedPath);
      return 'loaded';
    } catch (error) {
      if (requestVersion === folderLoadVersion.current) {
        showToast('error', '无法读取该文件夹', String(error));
      }
      return 'unreadable';
    } finally {
      if (requestVersion === folderLoadVersion.current) setIsLoadingFolder(false);
    }
  }, [currentPath, isSettingsInitialized, restoreSelectionFromHistory, settings, showToast]);

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
    setPresetEmptyHistory(preset === 'empty_history');
    setIsFailureDialogOpen(false);
    setIsSettingsOpen(false);
    setIsPreviewOpen(false);

    switch (preset) {
      case 'normal':
        setPresetSearchQuery('');
        setSelectedPaths(new Set());
        setSelectedSizes(new Map());
        setSelectableCounts(new Map());
        setExpandedFolders(new Set());
        setAuxiliaryView('selection');
        setNarrowActiveTab('tree');
        break;

      case 'search_over10':
        setPresetSearchQuery('icon');
        break;

      case 'search_empty':
        setPresetSearchQuery('non_existent_xyz_file');
        break;

      case 'empty_selection':
        setSelectedPaths(new Set());
        setSelectedSizes(new Map());
        setSelectableCounts(new Map());
        setAuxiliaryView('selection');
        if (viewportMode === 'narrow') setNarrowActiveTab('selection');
        showToast('info', '已切换到空选择态', '复制文件上下文包按钮已根据规范禁用');
        break;

      case 'empty_folder':
        setSelectedPaths(new Set());
        setSelectedSizes(new Map());
        setSelectableCounts(new Map());
        if (viewportMode === 'narrow') setNarrowActiveTab('tree');
        showToast('info', '已清空当前选择', '目录内容仍来自当前真实文件夹');
        break;

      case 'empty_history':
        setAuxiliaryView('history');
        if (viewportMode === 'narrow') setNarrowActiveTab('history');
        showToast('info', '已切换到无历史记录状态', '仅演示空状态，真实历史记录未被改动');
        break;

      case 'large_dir':
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
            detail: '状态预设演示数据：真实复制失败时此处显示 Rust 返回的底层错误。',
          },
          {
            filePath: `${currentPath}\\src\\core\\sqlite-storage.ts`,
            reason: '当前系统用户缺少对该文件的读取权限 (EACCES: permission denied)',
            code: 'EACCES',
            detail: '状态预设演示数据：真实复制失败时此处显示 Rust 返回的底层错误。',
          },
        ]);
        setIsFailureDialogOpen(true);
        break;

      case 'history_partial_fail':
        if (historyList.length === 0) {
          showToast('error', '暂无历史记录可重读', '请先复制一次文件上下文包');
          break;
        }
        void handleReReadFile(historyList[0]);
        break;

      case 'settings_open':
        handleOpenSettings();
        break;

      case 'copy_single_file':
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
          void handleExecuteCopy();
        } else {
          showToast('error', '无任何勾选文件', '请至少勾选一个文件后再复制');
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedPaths, rootNode, currentPath]);

  // Toggle single file selection
  const handleToggleFileSelect = (path: string, size?: number) => {
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
      // 搜索结果可能指向尚未加载进树的文件，此时用 fd 给出的大小
      else updated.set(path, node?.size ?? size ?? 0);
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
      setRootNode((root) => updateDirectoryNode(root, path, (directory) => appendDirectoryPage(directory, page)));
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
      setRootNode((root) => updateDirectoryNode(root, path, (current) => appendDirectoryPage(current, page)));
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

  // 定位必须真正让目标节点出现在树里：逐级展开祖先，缺页就继续追加，直到目标可见
  const handleLocateNodeInTree = async (path: string, isFolder: boolean) => {
    if (!currentPath) return;
    const requestVersion = folderLoadVersion.current;
    if (viewportMode === 'narrow') setNarrowActiveTab('tree');

    const ancestors = getAncestorPaths(path);
    setExpandedFolders((previous) => {
      const next = new Set(previous);
      ancestors.forEach((ancestor) => next.add(ancestor));
      if (isFolder) next.add(path);
      return next;
    });

    // 循环内需要读到刚写入的子项，所以同时维护一份本地树快照
    let tree = rootNode;
    const writeNode = (targetPath: string, update: (node: FileNode) => FileNode) => {
      tree = updateDirectoryNode(tree, targetPath, update);
      setRootNode((root) => updateDirectoryNode(root, targetPath, update));
    };

    const loadNextPage = async (directoryPath: string): Promise<boolean> => {
      const directory = findNodeByPath(tree, directoryPath);
      if (!directory || directory.type !== 'directory') return false;
      if (directory.children !== undefined && !directory.hasMoreChildren) return false;

      let page: DirectoryPage;
      try {
        page = await invoke<DirectoryPage>('load_directory_page', {
          rootPath: currentPath,
          relativePath: directoryPath,
          offset: directory.children?.length ?? 0,
          settings,
        });
      } catch (error) {
        showToast('error', '无法定位到该路径', String(error));
        return false;
      }
      if (requestVersion !== folderLoadVersion.current) return false;
      if (page.children.length === 0) return false;

      writeNode(directoryPath, (current) => appendDirectoryPage(current, page));
      return true;
    };

    const ensureChildLoaded = async (directoryPath: string, childName: string) => {
      for (;;) {
        const directory = findNodeByPath(tree, directoryPath);
        if (!directory || directory.type !== 'directory') return false;
        if (directory.children?.some((child) => child.name === childName)) return true;
        if (!(await loadNextPage(directoryPath))) return false;
      }
    };

    // 根目录用空串表示，ancestors 不含根
    const ancestorChain = ['', ...ancestors];
    for (let index = 0; index < ancestorChain.length; index += 1) {
      const childPath = index + 1 < ancestorChain.length ? ancestorChain[index + 1] : path;
      const childName = childPath.slice(childPath.lastIndexOf('/') + 1);
      if (!(await ensureChildLoaded(ancestorChain[index], childName))) return;
    }

    // 目录定位后会被展开，必须真正读出子项，否则呈现假空目录
    if (isFolder && findNodeByPath(tree, path)?.children === undefined) {
      await loadNextPage(path);
    }

    setHighlightedPath(path);
    setTimeout(() => {
      setHighlightedPath((current) => (current === path ? null : current));
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

  const handleSelectRecentFolder = async (folderPath: string) => {
    if ((await loadFolder(folderPath)) !== 'unreadable') return;
    setRecentFolders((previous) =>
      previous.filter((path) => normalizeFolderPath(path) !== normalizeFolderPath(folderPath))
    );
    void forgetRecentFolder(folderPath).catch((error) =>
      showToast('error', '无法把该路径从最近文件夹移除', String(error))
    );
  };

  const handleManualChangePath = (newPath: string) => {
    loadFolder(newPath);
  };

  // Preview generated package markdown
  const handlePreviewPackage = async () => {
    if (selectedPaths.size === 0) return;
    setIsCopying(true);
    try {
      const md = await buildContextPackage(currentPath, Array.from(selectedPaths));
      setPreviewMarkdown(md);
      setIsPreviewOpen(true);
    } catch (error) {
      reportPackageError(error, '无法生成文件上下文包');
    } finally {
      setIsCopying(false);
    }
  };

  // Execute Copy package (Requirement: copy button disabled when 0 selected, short success toast)
  const handleExecuteCopy = async (pathsToCopy?: string[]) => {
    const selectedArr = pathsToCopy ?? Array.from(selectedPaths);
    if (selectedArr.length === 0) return;

    setIsCopying(true);
    try {
      const md = await buildContextPackage(currentPath, selectedArr);
      if (!(await copyToClipboard(md))) return;

      // 写盘失败时 persistHistory 已经给出唯一一条提示，这里不再叠加成功提示
      if (await persistHistory(currentPath, selectedArr, md)) {
        showToast(
          'success',
          '已复制文件上下文包到剪贴板！',
          `共 ${selectedArr.length} 个文件，已加入复制历史`
        );
      }
    } catch (error) {
      reportPackageError(error, '无法生成文件上下文包');
    } finally {
      setIsCopying(false);
    }
  };

  // 快照正文懒加载（issue 48）：读失败只提示该条，条目保留在列表里由用户自行删除
  const loadHistoryBody = async (item: CopyHistoryItem): Promise<string | null> => {
    try {
      return await invoke<string>('read_history_body', { historyId: item.id });
    } catch (error) {
      showToast('error', '无法读取该条历史的快照正文', String(error));
      return null;
    }
  };

  // History Action 1: Copy saved snapshot directly（不重读源文件、不刷新创建时间）
  const handleCopyHistorySnapshot = async (item: CopyHistoryItem) => {
    const markdown = await loadHistoryBody(item);
    if (markdown === null) return;
    if (!(await copyToClipboard(markdown))) return;
    showToast(
      'success',
      '已复制保存的历史快照',
      `未重新扫描磁盘，保持 ${formatHistoryTime(item.createdAt)} 历史状态`
    );
  };

  // History Action 2: Re-read current files（忽略失败项，仅在有成功文件时替换该条历史）
  const handleReReadFile = async (item: CopyHistoryItem) => {
    try {
      const result = await invoke<RefreshedPackage>('refresh_context_package', {
        rootPath: item.sourceFolder,
        relativePaths: item.filePaths,
        settings,
      });

      if (result.markdown === null) {
        showToast(
          'error',
          `重读全部失败：${result.failures.length} 个文件均不可读取`,
          '已保留原历史快照与剪贴板不变'
        );
        return;
      }

      if (!(await copyToClipboard(result.markdown))) return;

      let replaced = true;
      try {
        await invoke('replace_history', {
          replacedId: item.id,
          sourceFolder: item.sourceFolder,
          filePaths: result.paths,
          markdown: result.markdown,
        });
      } catch (error) {
        replaced = false;
        showToast('error', '复制成功，但该条历史未能更新', String(error));
      }
      if (replaced) await refreshHistory();

      const skipped = result.failures.length;
      if (replaced) {
        showToast(
          skipped > 0 ? 'info' : 'success',
          skipped > 0
            ? `重读部分成功：已复制 ${result.paths.length} 个有效文件`
            : `已从磁盘重新读取 ${result.paths.length} 个当前文件并复制到剪贴板！`,
          skipped > 0
            ? `已跳过 ${skipped} 个失败文件，历史记录已用新快照替换`
            : '已更新并刷新该条历史记录时间戳'
        );
      }
    } catch (error) {
      reportPackageError(error, '无法重新读取文件');
    }
  };

  // History Action 3: Delete history item
  const handleDeleteHistory = async (id: string) => {
    try {
      await invoke('delete_history', { historyId: id });
    } catch (error) {
      showToast('error', '无法删除该条历史记录', String(error));
      return;
    }
    await refreshHistory();
    showToast('info', '已删除该条历史记录');
  };

  // View historical package snapshot modal
  const handleViewHistoricalSnapshot = async (item: CopyHistoryItem) => {
    const markdown = await loadHistoryBody(item);
    if (markdown === null) return;
    setPreviewMarkdown(markdown);
    setIsPreviewOpen(true);
  };

  // Right-click action: "仅复制当前文件" (Resolved grilling rule)
  // Generates single-file context package, adds 1 history item, does NOT change selectedPaths!
  const handleCopySingleFile = async (node: FileNode) => {
    try {
      const md = await buildContextPackage(currentPath, [node.path]);
      if (!(await copyToClipboard(md))) return;

      if (!(await persistHistory(currentPath, [node.path], md))) return;

      // Operates without changing any existing file or folder selection states
      showToast(
        'success',
        `已复制单文件上下文包 (仅当前文件: ${node.name})`,
        `不改变已有的 ${selectedPaths.size} 个选择状态，已按普通复制存入历史`
      );
    } catch (error) {
      reportPackageError(error, '无法生成单文件上下文包');
    }
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

  const handleOpenFileInDefaultApp = async (node: FileNode) => {
    if (node.type !== 'file') return;
    const absoluteNodePath = `${currentPath.replace(/[\\/]+$/, '')}\\${node.path.replace(/\//g, '\\')}`;
    try {
      await openPath(absoluteNodePath);
    } catch (error) {
      showToast(
        'error',
        '无法用系统默认程序打开文件',
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
          rootPath={currentPath}
          settings={settings}
          selectedPaths={selectedPaths}
          onToggleFileSelect={handleToggleFileSelect}
          onLocateNodeInTree={(path, isFolder) => void handleLocateNodeInTree(path, isFolder)}
          isFdAvailable={isFdAvailable}
          onRecheckFd={recheckFd}
          presetQuery={presetSearchQuery}
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
                  onOpenFileInDefaultApp={handleOpenFileInDefaultApp}
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
                historyList={visibleHistoryList}
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
                  onOpenFileInDefaultApp={handleOpenFileInDefaultApp}
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
                  historyList={visibleHistoryList}
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
          void handleExecuteCopy();
        }}
        onExcludeFailedAndRetry={(failedPaths) => {
          const failed = new Set(failedPaths);
          const remaining = Array.from(selectedPaths).filter((path) => !failed.has(path));
          setSelectedPaths((prev) => {
            const next = new Set(prev);
            failed.forEach((path) => next.delete(path));
            return next;
          });
          setSelectedSizes((previous) => {
            const next = new Map(previous);
            failed.forEach((path) => next.delete(path));
            return next;
          });
          setIsFailureDialogOpen(false);
          if (remaining.length === 0) {
            showToast('error', '剔除后已无可选文件', '请重新勾选后再复制');
            return;
          }
          showToast('info', '已剔除失效项并继续');
          void handleExecuteCopy(remaining);
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
