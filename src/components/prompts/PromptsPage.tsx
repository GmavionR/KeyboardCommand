import React, { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  Sparkles,
  Search,
  Plus,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Check,
  Folder,
  AlertTriangle,
  ArrowLeft,
  FileText,
  X,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { TitleBar } from "../common/TitleBar";
import { openSystemSettings } from "../../commands/dispatcher";
import type { PromptItem, SavePromptPayload } from "../../types/prompt";

export const PromptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [promptsDir, setPromptsDir] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 编辑 / 新建模态框状态
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PromptItem | null>(null);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formCommand, setFormCommand] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [allowOverwrite, setAllowOverwrite] = useState<boolean>(false);

  // 加载提示词及目录
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dir = await invoke<string>("get_prompts_dir");
      setPromptsDir(dir);
      const items = await invoke<PromptItem[]>("list_prompts");
      setPrompts(items);
    } catch (e) {
      console.error("加载提示词失败", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 选择更换目录
  const handleSelectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择提示词存放文件夹",
        defaultPath: promptsDir || undefined,
      });

      if (selected && typeof selected === "string") {
        const newDir = await invoke<string>("set_prompts_dir", { newDir: selected });
        setPromptsDir(newDir);
        await loadData();
      }
    } catch (e) {
      console.error("切换目录失败", e);
    }
  };

  // 在文件资源管理器中打开目录
  const handleOpenFolder = async () => {
    if (!promptsDir) return;
    try {
      await invoke("open_prompt_file", { filePath: promptsDir });
    } catch (e) {
      console.error("打开文件夹失败", e);
    }
  };

  // 打开新建弹窗
  const handleOpenNewModal = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormCommand("");
    setFormContent("");
    setFormError(null);
    setAllowOverwrite(false);
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEditModal = (item: PromptItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCommand(item.command || "");
    setFormContent(item.content);
    setFormError(null);
    setAllowOverwrite(false);
    setIsModalOpen(true);
  };

  // 提交保存提示词
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("标题不能为空");
      return;
    }
    if (!formContent.trim()) {
      setFormError("内容正文不能为空");
      return;
    }

    const payload: SavePromptPayload = {
      originalFilePath: editingItem ? editingItem.filePath : null,
      title: formTitle.trim(),
      command: formCommand.trim() ? formCommand.trim() : null,
      content: formContent.trim(),
      overwrite: allowOverwrite,
    };

    try {
      await invoke("save_prompt", { payload });
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      const errMsg = typeof err === "string" ? err : String(err);
      if (errMsg.includes("已存在同名")) {
        setAllowOverwrite(true);
        setFormError(`${errMsg}。再次点击“覆盖保存”将替换该文件。`);
      } else {
        setFormError(errMsg);
      }
    }
  };

  // 删除提示词
  const handleDelete = async (item: PromptItem) => {
    if (!window.confirm(`确定要删除提示词「${item.title}」吗？文件将被永久删除。`)) {
      return;
    }
    try {
      await invoke("delete_prompt", { filePath: item.filePath });
      await loadData();
    } catch (e) {
      console.error("删除失败", e);
    }
  };

  // 复制提示词内容到剪贴板
  const handleCopy = async (item: PromptItem) => {
    try {
      await writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {
      console.error("复制失败", e);
    }
  };

  // 过滤提示词列表
  const filteredPrompts = prompts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.command && p.command.toLowerCase().includes(q)) ||
      p.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none">
      {/* 顶部标题栏 */}
      <TitleBar onOpenSettings={openSystemSettings} />

      {/* 主界面内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部工具栏与导航 */}
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-6 py-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 左侧：返回按键、标题与目录展示 */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate({ to: "/folder-copy" })}
                title="返回文件夹内容复制"
                className="flex items-center justify-center size-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>

              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h1 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
                    提示词片段
                  </h1>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Folder className="size-3 shrink-0" />
                    <span className="truncate max-w-[320px] font-mono" title={promptsDir}>
                      {promptsDir || "加载中..."}
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectDirectory}
                      className="ml-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      更改
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={handleOpenFolder}
                      className="text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                    >
                      打开目录
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧操作按钮 */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadData}
                title="刷新列表"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>刷新</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewModal}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>新建提示词</span>
              </button>
            </div>
          </div>

          {/* 搜索过滤栏 */}
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="按标题、触发词（如 /eid）或正文搜索…"
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              共 <span className="font-semibold text-slate-900 dark:text-slate-100">{prompts.length}</span> 条提示词
              {searchQuery && `（筛选出 ${filteredPrompts.length} 条）`}
            </div>
          </div>
        </header>

        {/* 提示词卡片列表区 */}
        <main className="flex-1 overflow-y-auto p-6">
          {filteredPrompts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
              <FileText className="size-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                {searchQuery ? "没有找到符合搜索条件的提示词" : "当前提示词文件夹为空"}
              </p>
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
              >
                <Plus className="size-3.5" />
                <span>立即创建提示词</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrompts.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  {/* 卡片头部 */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="size-4 shrink-0 text-amber-500" />
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate" title={item.title}>
                          {item.title}
                        </h3>
                      </div>
                      {item.command && (
                        <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          /{item.command}
                        </span>
                      )}
                    </div>

                    {item.hasError && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-red-500">
                        <AlertTriangle className="size-3 shrink-0" />
                        <span>{item.errorMessage || "FrontMatter 解析警告"}</span>
                      </div>
                    )}

                    {/* 正文预览 */}
                    <p className="mt-2.5 line-clamp-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans whitespace-pre-wrap select-text">
                      {item.content}
                    </p>
                  </div>

                  {/* 卡片底部操作栏 */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="text-[11px] text-slate-400">
                      {item.updatedAt || "本地文件"}
                    </span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        title="复制提示词内容"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {copiedId === item.id ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => invoke("open_prompt_file", { filePath: item.filePath })}
                        title="在系统默认编辑器中打开"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <ExternalLink className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => invoke("reveal_prompt_file", { filePath: item.filePath })}
                        title="在文件资源管理器中定位"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <FolderOpen className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        title="编辑提示词"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <Edit2 className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        title="删除提示词"
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 新建 / 编辑提示词模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {editingItem ? "编辑提示词" : "新建提示词"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  标题（将作为文件名保存为 .md）
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    setAllowOverwrite(false);
                    setFormError(null);
                  }}
                  placeholder="如：详细解释、代码重构优化"
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  触发词 / 缩写（可选，用于命令检索及 AHK 热字串匹配）
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                    /
                  </span>
                  <input
                    type="text"
                    value={formCommand}
                    onChange={(e) => setFormCommand(e.target.value.replace(/^\//, ""))}
                    placeholder="如：eid、summary、refactor"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-7 pr-3 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  提示词内容正文（Markdown 格式，支持任意换行）
                </label>
                <textarea
                  required
                  rows={8}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="请输入要发送到聊天窗口或代码编辑器的提示词正文..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 font-sans text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none leading-relaxed resize-y select-text"
                />
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-4 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`h-8 px-4 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer ${
                    allowOverwrite
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {allowOverwrite ? "确认覆盖保存" : "保存提示词"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
