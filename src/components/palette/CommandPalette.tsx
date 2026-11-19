import { useCallback, useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { ArrowRight, Check, Search } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { ThemeProvider, useTheme } from "../../context/ThemeContext";
import {
  createDefaultRegistry,
  createAppearanceProvider,
} from "../../commands";
import type { CommandItem, CommandCategory } from "../../commands";

// ─────────────────────────────────────────────
// 文本高亮：将 query 命中片段用 <mark> 包裹
// ─────────────────────────────────────────────
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const lowerQ = query.toLowerCase();
  const idx = lower.indexOf(lowerQ);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-amber-200 px-0.5 text-inherit dark:bg-amber-500/40">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─────────────────────────────────────────────
// 是否命中：标题或任意别名包含 query（不敏感大小写）
// ─────────────────────────────────────────────
function matchesQuery(item: CommandItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (item.title.toLowerCase().includes(q)) return true;
  return (item.aliases ?? []).some((a) => a.toLowerCase().includes(q));
}

// ─────────────────────────────────────────────
// 分类顺序
// ─────────────────────────────────────────────
const CATEGORY_ORDER: CommandCategory[] = ["页面", "操作", "外观", "设置"];

// ─────────────────────────────────────────────
// 执行上下文构造
// ─────────────────────────────────────────────
function buildContext() {
  return {
    navigate: async (to: string) => {
      await invoke("show_main_window").catch(() => {});
      // 通过事件让主窗口路由跳转（issue 32 完善）
      await emit("kbc://navigate", to);
    },
    activateMainWindow: async () => {
      await invoke("show_main_window").catch(() => {});
    },
    emitEvent: async (event: string, payload?: unknown) => {
      await emit(event, payload);
    },
  };
}

// ─────────────────────────────────────────────
// 核心面板（需 ThemeProvider 包裹）
// ─────────────────────────────────────────────
function PaletteInner() {
  const { themeMode } = useTheme();
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const appWindow = getCurrentWindow();
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载命令列表（依赖 themeMode 以更新 checked 状态）
  useEffect(() => {
    const registry = createDefaultRegistry().register(
      createAppearanceProvider(themeMode),
    );
    void registry.getCommands().then(setCommands);
  }, [themeMode]);

  // 窗口每次显示时重置搜索并聚焦（通过 focus 事件触发）
  useEffect(() => {
    function onFocus() {
      setQuery("");
      // 短暂延迟确保窗口动画完毕
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    window.addEventListener("focus", onFocus);
    // 首次加载也立即聚焦
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // 隐藏面板
  const hidePalette = useCallback(() => {
    void appWindow.hide();
  }, [appWindow]);

  // 执行命令后隐藏
  const runCommand = useCallback(
    async (item: CommandItem) => {
      hidePalette();
      try {
        await item.run(buildContext());
      } catch (e) {
        console.error("命令执行失败", e);
      }
    },
    [hidePalette],
  );

  // 过滤命令
  const filtered = commands.filter((c) => matchesQuery(c, query));

  // 按分类分组
  const groups = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: filtered.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen items-start justify-center bg-transparent">
      <Command
        className="w-full max-w-[640px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        loop
        // 禁用 vim 绑定（cmdk ≥1.x 默认不启用，明确传 false 保险）
        vimBindings={false}
        shouldFilter={false}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Escape") hidePalette();
        }}
      >
        {/* 搜索输入框 */}
        <div className="flex items-center border-b border-slate-200 px-4 dark:border-slate-700/60">
          <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="输入命令或功能名称..."
            className="h-12 w-full bg-transparent text-base text-slate-900 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        {/* 命令列表 */}
        <Command.List className="max-h-[352px] overflow-y-auto overscroll-contain py-1.5">
          <Command.Empty className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            没有搜索到匹配命令
          </Command.Empty>

          {groups.map(({ category, items }) => (
            <Command.Group
              key={category}
              heading={category}
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:dark:text-slate-500"
            >
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  disabled={item.canExecute?.() === false}
                  onSelect={() => void runCommand(item)}
                  className="mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 aria-selected:bg-blue-50 aria-selected:text-blue-900 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 dark:text-slate-300 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-200"
                >
                  {/* 标题（含高亮） */}
                  <span className="flex-1 truncate">
                    {highlight(item.title, query)}
                    {item.disabledReason && (
                      <span className="ml-2 text-xs text-slate-400">
                        ({item.disabledReason})
                      </span>
                    )}
                  </span>

                  {/* 快捷键提示 */}
                  {item.shortcut && (
                    <kbd className="shrink-0 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {item.shortcut}
                    </kbd>
                  )}

                  {/* 状态图标：checked → ✓，jump → → */}
                  {item.checked ? (
                    <Check className="h-4 w-4 shrink-0 text-blue-500" />
                  ) : item.type === "jump" ? (
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>

        {/* 底部操作提示条 */}
        <div className="flex items-center gap-4 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-700/60 dark:text-slate-500">
          <span>
            <kbd className="font-mono">↑↓</kbd> 选择
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> 执行
          </span>
          <span>
            <kbd className="font-mono">esc</kbd> 隐藏
          </span>
        </div>
      </Command>
    </div>
  );
}

// ─────────────────────────────────────────────
// 对外导出：包裹 ThemeProvider
// ─────────────────────────────────────────────
export function CommandPalette() {
  return (
    <ThemeProvider>
      <PaletteInner />
    </ThemeProvider>
  );
}
