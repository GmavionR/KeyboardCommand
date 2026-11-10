import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Database,
  Check,
  AlertTriangle,
  FolderMinus,
  FileCode2,
  FileSpreadsheet,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { SettingsConfig } from '../../types';
import {
  DEFAULT_IGNORED_DIRS,
  DEFAULT_WHITELIST,
  DEFAULT_EXCLUSIONS,
} from '../../data/defaultSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: SettingsConfig;
  onSaveSettings: (newSettings: SettingsConfig) => Promise<boolean>;
  isSettingsLoading?: boolean;
  settingsLoadError?: string | null;
  onRetryLoadSettings?: () => void;
  isSqliteSaving?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaveSettings,
  isSettingsLoading = false,
  settingsLoadError = null,
  onRetryLoadSettings,
  isSqliteSaving = false,
}) => {
  // Local editable draft state
  const [draft, setDraft] = useState<SettingsConfig>({
    whitelist: [...currentSettings.whitelist],
    exclusions: [...currentSettings.exclusions],
    ignoredDirectories: [...currentSettings.ignoredDirectories],
    largeDirThreshold: currentSettings.largeDirThreshold,
  });

  const [newWhitelistItem, setNewWhitelistItem] = useState('');
  const [newExclusionItem, setNewExclusionItem] = useState('');
  const [newIgnoredDirItem, setNewIgnoredDirItem] = useState('');

  // Threshold validation state (must be positive integer)
  const [thresholdInput, setThresholdInput] = useState<string>(
    String(currentSettings.largeDirThreshold)
  );
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  // Validate threshold on change
  useEffect(() => {
    const trimmed = thresholdInput.trim();
    if (!trimmed) {
      setThresholdError('阈值不能为空，请输入大于 0 的正整数');
      return;
    }
    if (trimmed.includes('.')) {
      setThresholdError('阈值必须为整数，不支持小数');
      return;
    }
    const num = Number(trimmed);
    if (!Number.isInteger(num) || isNaN(num)) {
      setThresholdError('请输入有效的整数');
      return;
    }
    if (num <= 0) {
      setThresholdError('阈值必须为正整数 (大于 0)');
      return;
    }
    setThresholdError(null);
    setDraft((prev) => ({ ...prev, largeDirThreshold: num }));
  }, [thresholdInput]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || isSettingsLoading || settingsLoadError) return;
    setDraft({
      whitelist: [...currentSettings.whitelist],
      exclusions: [...currentSettings.exclusions],
      ignoredDirectories: [...currentSettings.ignoredDirectories],
      largeDirThreshold: currentSettings.largeDirThreshold,
    });
    setThresholdInput(String(currentSettings.largeDirThreshold));
    setErrorMessage(null);
    setErrorDetails(null);
  }, [currentSettings, isOpen, isSettingsLoading, settingsLoadError]);

  // Section 1: Whitelist operations
  const handleAddWhitelist = () => {
    const val = newWhitelistItem.trim();
    if (!val) return;
    if (!draft.whitelist.includes(val)) {
      setDraft((prev) => ({ ...prev, whitelist: [...prev.whitelist, val] }));
      setNewWhitelistItem('');
    }
  };

  const handleRemoveWhitelist = (item: string) => {
    setDraft((prev) => ({
      ...prev,
      whitelist: prev.whitelist.filter((w) => w !== item),
    }));
  };

  const handleRestoreDefaultWhitelist = () => {
    setDraft((prev) => ({
      ...prev,
      whitelist: [...DEFAULT_WHITELIST],
    }));
  };

  // Section 2: Exclusion operations
  const handleAddExclusion = () => {
    const val = newExclusionItem.trim();
    if (!val) return;
    if (!draft.exclusions.includes(val)) {
      setDraft((prev) => ({ ...prev, exclusions: [...prev.exclusions, val] }));
      setNewExclusionItem('');
    }
  };

  const handleRemoveExclusion = (item: string) => {
    setDraft((prev) => ({
      ...prev,
      exclusions: prev.exclusions.filter((e) => e !== item),
    }));
  };

  const handleRestoreDefaultExclusions = () => {
    setDraft((prev) => ({
      ...prev,
      exclusions: [...DEFAULT_EXCLUSIONS],
    }));
  };

  // Section 3: Ignored Directories operations
  const handleAddIgnoredDir = () => {
    const val = newIgnoredDirItem.trim();
    if (!val) return;
    if (!draft.ignoredDirectories.includes(val)) {
      setDraft((prev) => ({
        ...prev,
        ignoredDirectories: [...prev.ignoredDirectories, val],
      }));
      setNewIgnoredDirItem('');
    }
  };

  const handleRemoveIgnoredDir = (item: string) => {
    setDraft((prev) => ({
      ...prev,
      ignoredDirectories: prev.ignoredDirectories.filter((d) => d !== item),
    }));
  };

  const handleRestoreDefaultIgnoredDirs = () => {
    setDraft((prev) => ({
      ...prev,
      ignoredDirectories: [...DEFAULT_IGNORED_DIRS],
    }));
  };

  // Section 4: Dedicated restore for Threshold only
  const handleRestoreDefaultThreshold = () => {
    setThresholdInput('50');
    setDraft((prev) => ({
      ...prev,
      largeDirThreshold: 50,
    }));
  };

  const isSaveDisabled = !!thresholdError || isSqliteSaving;

  const handleSave = async () => {
    if (thresholdError) return;
    setErrorMessage(null);
    setErrorDetails(null);
    try {
      const success = await onSaveSettings(draft);
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 700);
      } else {
        setErrorMessage('设置保存或应用失败，草稿和当前页面状态已保留');
      }
    } catch (error) {
      setErrorMessage('设置保存或应用失败，草稿和当前页面状态已保留');
      setErrorDetails(String(error));
    }
  };

  if (!isOpen) return null;

  if (isSettingsLoading || settingsLoadError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4">
        <div className="w-full max-w-lg rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">文件夹复制功能设置</h2>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="关闭设置">✕</button>
          </div>
          {isSettingsLoading ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">正在从 SQLite 读取设置…</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-rose-700 dark:text-rose-300">读取 SQLite 设置失败。编辑表单已禁用，请重试或关闭设置。</p>
              <details className="text-xs text-slate-600 dark:text-slate-400">
                <summary className="cursor-pointer">查看技术详情</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">{settingsLoadError}</pre>
              </details>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-3 py-1.5 rounded bg-slate-200 dark:bg-slate-700">关闭</button>
                <button type="button" onClick={onRetryLoadSettings} className="px-3 py-1.5 rounded bg-blue-600 text-white">重试</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh] text-slate-800 dark:text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-500/30">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                文件夹复制功能设置
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                  SQLite 持久化
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                可滚动纵向分组浏览；各分区独立提供恢复默认值；输入有效正整数后可保存
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

        {/* Quick Anchor Bar */}
        <div className="bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 px-5 py-2 flex items-center space-x-4 text-[11px] text-slate-600 dark:text-slate-400 overflow-x-auto shrink-0">
          <span className="text-slate-400 dark:text-slate-500 shrink-0">快速跳转:</span>
          <a
            href="#section-whitelist"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            1. 文件白名单 ({draft.whitelist.length})
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a
            href="#section-exclusions"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            2. 排除规则 ({draft.exclusions.length})
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a
            href="#section-ignored"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            3. 忽略目录 ({draft.ignoredDirectories.length})
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a
            href="#section-threshold"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            4. 大目录阈值 ({draft.largeDirThreshold})
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a
            href="#section-appearance"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            5. 外观与主题
          </a>
        </div>

        {/* Scrollable Body: 4 Vertical Stacked Sections + Appearance */}
        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-6 divide-y divide-slate-200 dark:divide-slate-800/70">
          {/* SECTION 1: 文件白名单 */}
          <div id="section-whitelist" className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  1. 文件白名单 ({draft.whitelist.length})
                </h3>
              </div>

              {/* Dedicated Restore Default for Whitelist */}
              <button
                type="button"
                onClick={handleRestoreDefaultWhitelist}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                title="仅恢复文件白名单默认值，不影响其他分区"
              >
                <RotateCcw className="w-3 h-3" />
                <span>恢复默认白名单</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              面向源码、配置、文档、脚本文本文件。扩展名带点（如{' '}
              <code className="text-blue-600 dark:text-blue-300 font-mono">.ts</code>），特殊全名不带点（如{' '}
              <code className="text-blue-600 dark:text-blue-300 font-mono">Dockerfile</code>）。敏感文本文件（如{' '}
              <code className="text-amber-600 dark:text-amber-300 font-mono">.env</code>）无硬编码限制；二进制文件不在默认白名单中。
            </p>

            {/* Add Whitelist Form */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newWhitelistItem}
                onChange={(e) => setNewWhitelistItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWhitelist()}
                placeholder="添加扩展名或文件名，如 .rs, .vue, Jenkinsfile"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddWhitelist}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>

            {/* Whitelist Tags Cloud */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/40">
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {draft.whitelist.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 font-mono text-[11px] shadow-2xs"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWhitelist(item)}
                      className="text-slate-400 hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                      title="删除该规则"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: 文件排除规则 */}
          <div id="section-exclusions" className="space-y-3 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  2. 文件名/路径排除规则 ({draft.exclusions.length})
                </h3>
              </div>

              {/* Dedicated Restore Default for Exclusions */}
              <button
                type="button"
                onClick={handleRestoreDefaultExclusions}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                title="仅恢复排除规则默认值，不影响其他分区"
              >
                <RotateCcw className="w-3 h-3" />
                <span>恢复默认排除规则</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              规则全局共用，且在白名单之后二次应用过滤。默认包含锁文件模式及{' '}
              <code className="text-amber-600 dark:text-amber-300 font-mono">.DS_Store</code>、
              <code className="text-amber-600 dark:text-amber-300 font-mono">Thumbs.db</code> 等构建噪音文件。
            </p>

            {/* Add Exclusion Form */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newExclusionItem}
                onChange={(e) => setNewExclusionItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExclusion()}
                placeholder="添加排除规则模式，如 *.lock, *.min.js, *.map"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddExclusion}
                className="flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-medium cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>

            {/* Exclusions List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/40">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                {draft.exclusions.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between px-2.5 py-1 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded font-mono text-[11px] text-slate-700 dark:text-slate-200 shadow-2xs"
                  >
                    <span className="truncate">{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExclusion(item)}
                      className="text-slate-400 hover:text-rose-500 ml-1.5 cursor-pointer"
                      title="删除排除规则"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: 忽略目录 */}
          <div id="section-ignored" className="space-y-3 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderMinus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  3. 忽略目录 ({draft.ignoredDirectories.length})
                </h3>
              </div>

              {/* Dedicated Restore Default for Ignored Directories (issue27) */}
              <button
                type="button"
                onClick={handleRestoreDefaultIgnoredDirs}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                title="仅恢复系统预设的 27 个默认忽略目录清单 (issue27)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>恢复默认忽略目录</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              按目录名称作用于当前根目录下任意嵌套层级。命中忽略的目录树节点仍展示并标注「已忽略」，但无法展开其后代且不计入选择。
            </p>

            {/* Add Ignored Dir Form */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newIgnoredDirItem}
                onChange={(e) => setNewIgnoredDirItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddIgnoredDir()}
                placeholder="添加忽略目录名，如 .next, target, build"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddIgnoredDir}
                className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-xs font-medium cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>

            {/* Ignored Directories Grid */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/40">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {draft.ignoredDirectories.map((dir) => (
                  <div
                    key={dir}
                    className="flex items-center justify-between px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-[11px] text-slate-700 dark:text-slate-200 shadow-2xs"
                  >
                    <span className="truncate">{dir}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIgnoredDir(dir)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                      title="取消忽略"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: 大目录阈值 (Positive Integer Validation) */}
          <div id="section-threshold" className="space-y-3 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  4. 大目录阈值
                </h3>
              </div>

              {/* Dedicated Restore Default for Threshold */}
              <button
                type="button"
                onClick={handleRestoreDefaultThreshold}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                title="仅恢复阈值默认值 50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>恢复默认阈值 (50)</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              当单个目录直接子项数超过此阈值时启用分批加载（首批展示 30 项并支持追加）。
              <span className="text-amber-600 dark:text-amber-300 font-medium ml-1">
                本字段只接受正整数，空值、零、负数或小数将显示错误并禁用保存。
              </span>
            </p>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                  直接子项数量阈值:
                </label>
                <input
                  type="text"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  placeholder="50"
                  className={`w-28 px-3 py-1.5 bg-white dark:bg-slate-950 border rounded-md text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none transition-colors ${
                    thresholdError
                      ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200'
                      : 'border-slate-300 dark:border-slate-700 focus:border-blue-500'
                  }`}
                />
                <span className="text-slate-500 dark:text-slate-400 text-xs">项</span>
              </div>

              {/* Inline Validation Error */}
              {thresholdError ? (
                <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{thresholdError}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>格式有效（正整数: {draft.largeDirThreshold}）</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500">
            设置存储在应用配置目录的 SQLite 数据库中。
          </div>

          {/* Error Feedback Banner */}
          {errorMessage && (
            <div className="px-3 py-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              <div className="flex-1 text-[11px]">
                <div>{errorMessage}</div>
                {errorDetails && (
                  <details className="mt-1 font-mono">
                    <summary className="cursor-pointer">查看技术详情</summary>
                    <pre className="mt-1 whitespace-pre-wrap break-all">{errorDetails}</pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Success message */}
          {saveSuccess && (
            <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>设置已保存至 SQLite 并在当前目录重新生效！</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            {thresholdError ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                存在无效输入，保存已禁用
              </span>
            ) : (
              <span>修改将写入本地 SQLite 并自动重新加载目录树</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSqliteSaving}
              className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              取消 / 放弃修改
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-xs font-medium shadow-sm transition-all cursor-pointer ${
                isSaveDisabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/60'
                  : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'
              }`}
              title={thresholdError ? '请先修正大目录阈值错误' : '保存设置'}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSqliteSaving ? '正在保存到 SQLite...' : '保存并重新加载'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
