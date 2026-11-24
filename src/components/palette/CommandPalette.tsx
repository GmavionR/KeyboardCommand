import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import {
  ArrowRight,
  Check,
  Command as CommandIcon,
  Copy,
  CornerDownLeft,
  FolderOpen,
  Monitor,
  Moon,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  FileText,
  Square,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { ThemeProvider, useTheme } from "../../context/ThemeContext";
import {
  createDefaultRegistry,
  createAppearanceProvider,
} from "../../commands";
import type { CommandItem, CommandCategory } from "../../commands";
import type { PromptItem } from "../../types/prompt";

const PALETTE_WIDTH = 640;
const GUTTER_X = 64;
const GUTTER_TOP = 32;
const GUTTER_BOTTOM = 96;
const WINDOW_WIDTH = PALETTE_WIDTH + GUTTER_X * 2;
const WINDOW_EXTRA_HEIGHT = GUTTER_TOP + GUTTER_BOTTOM;
const DEFAULT_SHORTCUT = "Ctrl+Shift+K";

export type OverlayMode = "command" | "prompts" | "blank";

export const OVERLAY_MODES: { id: OverlayMode; label: string; num: string }[] = [
  { id: "command", label: "命令", num: "1" },
  { id: "prompts", label: "提示词", num: "2" },
  { id: "blank", label: "空白页", num: "3" },
];

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

function matchesQuery(item: CommandItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (item.title.toLowerCase().includes(q)) return true;
  return (item.aliases ?? []).some((a) => a.toLowerCase().includes(q));
}

function matchesPrompt(item: PromptItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (item.title.toLowerCase().includes(q)) return true;
  if (item.command && item.command.toLowerCase().includes(q)) return true;
  return item.content.toLowerCase().includes(q);
}

const CATEGORY_ORDER: CommandCategory[] = ["页面", "操作", "外观", "设置"];

const ICON_BY_ID: Record<string, LucideIcon> = {
  "route./folder-copy": Copy,
  "route./prompts": Sparkles,
};

const ICON_BY_NAME: Record<string, LucideIcon> = {
  "folder-open": FolderOpen,
  monitor: Monitor,
  sun: Sun,
  moon: Moon,
  settings: Settings,
  sliders: SlidersHorizontal,
  "arrow-right": ArrowRight,
};

function iconFor(item: CommandItem): LucideIcon {
  return (
    ICON_BY_ID[item.id] ??
    ICON_BY_NAME[item.icon ?? ""] ??
    (item.type === "jump" ? ArrowRight : CommandIcon)
  );
}

function displayTitle(item: CommandItem): string {
  return item.category === "外观"
    ? item.title.replace(/^外观：/, "")
    : item.title;
}

function shortcutKeys(shortcut: string): string[] {
  return shortcut
    .split("+")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => (k === "Super" || k === "Meta" ? "Win" : k));
}

const KBD_CHIP =
  "inline-flex h-5 min-w-5 items-center justify-center rounded border border-pal-border bg-pal-raised px-1.5 font-mono text-[10px] font-medium text-pal-muted-fg shadow-[0_1px_0_var(--pal-border)] whitespace-nowrap select-none";

function buildContext() {
  return {
    navigate: async (to: string) => {
      try {
        localStorage.setItem("kbc_last_route", to);
      } catch (_) {}
      await invoke("show_main_window", { route: to }).catch(() => {});
      await emit("kbc://navigate", to);
    },
    activateMainWindow: async () => {
      await invoke("show_main_window").catch(() => {});
    },
    emitEvent: async (event: string, payload?: unknown) => {
      try {
        localStorage.setItem("kbc_pending_action", event);
      } catch (_) {}
      await emit(event, payload);
    },
  };
}

interface ShortcutStatusInfo {
  shortcut: string;
  registered: boolean;
  error: string | null;
}

function PaletteInner() {
  const { themeMode } = useTheme();
  const [mode, setMode] = useState<OverlayMode>("command");
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT);
  // 仅在窗口失焦（即隐藏）时递增 session，重置内部选中态；
  // 模式切换绝不改变 session，以保持 DOM 热挂载，实现 0ms 瞬间渲染与防掉帧
  const [session, setSession] = useState(0);
  const appWindow = getCurrentWindow();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 极速模式切换：仅切换局部状态，不销毁重新挂载 DOM，零白屏、零掉帧
  const switchToMode = useCallback((target: OverlayMode) => {
    setMode(target);
    setQuery("");
    inputRef.current?.focus();
  }, []);

  const cycleMode = useCallback((reverse = false) => {
    setMode((curr) => {
      const idx = OVERLAY_MODES.findIndex((m) => m.id === curr);
      const nextIdx = reverse
        ? (idx - 1 + OVERLAY_MODES.length) % OVERLAY_MODES.length
        : (idx + 1) % OVERLAY_MODES.length;
      return OVERLAY_MODES[nextIdx].id;
    });
    setQuery("");
    inputRef.current?.focus();
  }, []);

  // 监听来自后端/外部消息的模式切换指令
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string>("picker-mode-switch", ({ payload }) => {
      const target: OverlayMode =
        payload === "prompts" || payload === "snippets"
          ? "prompts"
          : payload === "blank"
          ? "blank"
          : "command";
      switchToMode(target);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [switchToMode]);

  // 加载命令列表
  useEffect(() => {
    const registry = createDefaultRegistry().register(
      createAppearanceProvider(themeMode),
    );
    void registry.getCommands().then(setCommands);
  }, [themeMode]);

  // 加载提示词列表（预热常驻内存）
  const loadPrompts = useCallback(() => {
    void invoke<PromptItem[]>("list_prompts")
      .then(setPrompts)
      .catch((err) => console.error("加载提示词失败", err));
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 读取当前唤起热键
  useEffect(() => {
    void invoke<ShortcutStatusInfo>("get_shortcut_status")
      .then((info) => setShortcut(info.shortcut))
      .catch(() => {});
    let unlisten: (() => void) | undefined;
    void listen<ShortcutStatusInfo>("palette-shortcut-changed", ({ payload }) => {
      setShortcut(payload.shortcut);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  // 焦点与隐藏重置
  useEffect(() => {
    function onFocus() {
      inputRef.current?.focus();
      loadPrompts();
    }
    function onBlur() {
      setQuery("");
      setMode("command"); // 每次关闭后默认恢复为命令模式
      setSession((s) => s + 1);
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    if (document.hasFocus()) inputRef.current?.focus();
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [loadPrompts]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const height = Math.ceil(el.getBoundingClientRect().height) + WINDOW_EXTRA_HEIGHT;
    void appWindow
      .setSize(new LogicalSize(WINDOW_WIDTH, height))
      .catch(() => {});
  }, [appWindow, session, query, commands, prompts, mode]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = Math.ceil(entries[0].contentRect.height) + WINDOW_EXTRA_HEIGHT;
      void appWindow
        .setSize(new LogicalSize(WINDOW_WIDTH, height))
        .catch(() => {});
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [appWindow, session]);

  const hidePalette = useCallback(() => {
    void appWindow.hide();
  }, [appWindow]);

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

  const sendPrompt = useCallback(
    async (item: PromptItem) => {
      hidePalette();
      try {
        await invoke("paste_prompt", { content: item.content, restoreClipboard: true });
      } catch (e) {
        console.error("发送提示词失败", e);
      }
    },
    [hidePalette],
  );

  // 过滤命令与提示词（纯内存过滤，耗时 < 0.5ms）
  const filteredCommands = commands.filter((c) => matchesQuery(c, query));
  const filteredPrompts = prompts.filter((p) => matchesPrompt(p, query));

  const commandGroups = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: filteredCommands.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="flex min-h-screen items-start justify-center bg-transparent px-16 pb-24 pt-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) hidePalette();
      }}
    >
      <Command
        key={session}
        ref={rootRef}
        className="w-full max-w-[640px] overflow-hidden rounded-[20px] bg-pal-surface shadow-palette"
        loop
        vimBindings={false}
        shouldFilter={false}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Escape") {
            hidePalette();
          } else if (e.key === "Tab") {
            e.preventDefault();
            cycleMode(e.shiftKey);
          } else if (e.ctrlKey && e.key === "1") {
            e.preventDefault();
            switchToMode("command");
          } else if (e.ctrlKey && e.key === "2") {
            e.preventDefault();
            switchToMode("prompts");
          } else if (e.ctrlKey && e.key === "3") {
            e.preventDefault();
            switchToMode("blank");
          }
        }}
      >
        {/* 顶部搜索框与形态选择条（精巧紧凑布局，绝不挤压输入框文本） */}
        <div className="flex items-center gap-3 border-b border-pal-border px-4 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center text-pal-muted-fg">
            {mode === "command" ? (
              <Search className="size-4.5" />
            ) : mode === "prompts" ? (
              <Sparkles className="size-4.5 text-amber-500" />
            ) : (
              <Square className="size-4.5 text-cyan-500" />
            )}
          </div>

          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder={
              mode === "command"
                ? "搜索命令或功能…"
                : mode === "prompts"
                ? "搜索提示词并回车发送…"
                : "空白页面视图"
            }
            className="h-11 flex-1 min-w-0 bg-transparent text-sm text-pal-fg outline-none placeholder:text-pal-muted-fg"
          />

          {/* 模式切换器：精巧的 Segmented Tabs（紧凑、清晰、不占过多宽度） */}
          <div className="flex items-center rounded-lg border border-pal-border bg-pal-muted/40 p-0.5 shrink-0 select-none">
            {OVERLAY_MODES.map((m) => {
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => switchToMode(m.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-pal-raised text-pal-fg shadow-xs font-semibold"
                      : "text-pal-muted-fg hover:text-pal-fg hover:bg-pal-raised/40 font-normal"
                  }`}
                  title={`按 Ctrl+${m.num} 或 Tab 切换`}
                >
                  <span className="font-mono text-[10px] opacity-40">^{m.num}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <kbd className={`${KBD_CHIP} shrink-0`}>esc</kbd>
        </div>

        {/* 列表区域 / 视图模式容器（保持 min-h-[300px] 保证切换模式时高度平滑无闪烁） */}
        <Command.List className="palette-scroll min-h-[300px] max-h-[382px] overflow-y-auto overscroll-contain p-2 scroll-py-2">
          {mode === "command" ? (
            <>
              <Command.Empty className="py-12 text-center text-sm text-pal-muted-fg">
                没有搜索到匹配命令
              </Command.Empty>

              {commandGroups.map(({ category, items }) => (
                <Command.Group
                  key={category}
                  heading={category}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.05em] [&_[cmdk-group-heading]]:text-pal-muted-fg"
                >
                  {items.map((item) => {
                    const Icon = iconFor(item);
                    return (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        disabled={item.canExecute?.() === false}
                        onSelect={() => void runCommand(item)}
                        className="group relative flex h-11 cursor-pointer select-none items-center gap-3 rounded-lg px-3 text-sm text-pal-fg transition-colors aria-selected:bg-pal-brand-soft aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                      >
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-pal-brand opacity-0 transition-opacity group-aria-selected:opacity-100" />
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-pal-border bg-pal-raised text-pal-muted-fg transition-colors group-aria-selected:border-transparent group-aria-selected:bg-pal-brand group-aria-selected:text-pal-on-brand">
                          <Icon className="size-4" />
                        </span>
                        <span className="flex-1 truncate">
                          {(category === "页面" || category === "外观") && (
                            <span className="mr-1.5 text-pal-muted-fg">
                              {category} ·
                            </span>
                          )}
                          {highlight(displayTitle(item), query)}
                          {item.disabledReason && (
                            <span className="ml-2 text-xs text-pal-muted-fg">
                              ({item.disabledReason})
                            </span>
                          )}
                        </span>
                        {item.shortcut && (
                          <span className="flex shrink-0 gap-1">
                            {shortcutKeys(item.shortcut).map((k) => (
                              <kbd key={k} className={KBD_CHIP}>
                                {k}
                              </kbd>
                            ))}
                          </span>
                        )}
                        {item.checked ? (
                          <Check className="size-4 shrink-0 text-pal-brand" />
                        ) : item.type === "jump" ? (
                          <CornerDownLeft className="size-4 shrink-0 text-pal-muted-fg transition-colors group-aria-selected:text-pal-brand" />
                        ) : null}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </>
          ) : mode === "prompts" ? (
            <>
              <Command.Empty className="py-12 text-center text-sm text-pal-muted-fg">
                没有找到匹配的提示词
              </Command.Empty>

              <Command.Group
                heading="可用提示词（回车直接发送到当前窗口）"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.05em] [&_[cmdk-group-heading]]:text-pal-muted-fg"
              >
                {filteredPrompts.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => void sendPrompt(item)}
                    className="group relative flex h-13 cursor-pointer select-none items-center gap-3 rounded-lg px-3 text-sm text-pal-fg transition-colors aria-selected:bg-pal-brand-soft"
                  >
                    <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-amber-500 opacity-0 transition-opacity group-aria-selected:opacity-100" />
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-pal-border bg-pal-raised text-pal-muted-fg transition-colors group-aria-selected:border-transparent group-aria-selected:bg-amber-500 group-aria-selected:text-white">
                      <FileText className="size-4" />
                    </span>

                    <div className="flex flex-1 flex-col truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-pal-fg">
                          {highlight(item.title, query)}
                        </span>
                        {item.command && (
                          <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            /{highlight(item.command, query)}
                          </span>
                        )}
                        {item.hasError && (
                          <span className="rounded bg-red-500/10 px-1.5 text-[10px] text-red-500">
                            格式警告
                          </span>
                        )}
                      </div>
                      <span className="truncate text-xs text-pal-muted-fg">
                        {item.content}
                      </span>
                    </div>

                    <span className="flex shrink-0 items-center gap-1 text-xs text-pal-muted-fg opacity-0 transition-opacity group-aria-selected:opacity-100">
                      <span>发送</span>
                      <CornerDownLeft className="size-3.5 text-amber-500" />
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          ) : (
            /* 形态 3：单独的空白页面内放入 h1 */
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center select-none">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500 mb-4 border border-cyan-500/20 shadow-xs">
                <Square className="size-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-pal-fg">
                空白页面
              </h1>
              <p className="mt-2 text-xs text-pal-muted-fg max-w-sm leading-relaxed">
                这是快捷浮窗的第三种形态（视图模式）。你可以按 Tab 循环切换，或按 Ctrl+1 返回命令面板。
              </p>
              <div className="mt-6 flex items-center gap-2 text-[11px] text-pal-muted-fg">
                <span>按</span>
                <kbd className={KBD_CHIP}>Tab</kbd>
                <span>循环切换形态，或按</span>
                <kbd className={KBD_CHIP}>Ctrl+1</kbd>
                <span>直达命令面板</span>
              </div>
            </div>
          )}
        </Command.List>

        {/* 底部指引条：彻底解决竖向折字与错位，完全 whitespace-nowrap 布局 */}
        <div className="flex items-center justify-between border-t border-pal-border bg-pal-muted/40 px-4 py-2 text-[11px] text-pal-muted-fg select-none">
          {/* 左侧操作快捷键组 */}
          <div className="flex items-center gap-3.5 whitespace-nowrap overflow-hidden">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <kbd className={KBD_CHIP}>Tab</kbd>
              <span>切换形态</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <kbd className={KBD_CHIP}>Ctrl+1..3</kbd>
              <span>直达</span>
            </span>
            {mode !== "blank" && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <kbd className={KBD_CHIP}>↑↓</kbd>
                <span>选择</span>
                <kbd className={KBD_CHIP}>↵</kbd>
                <span>{mode === "command" ? "执行" : "发送"}</span>
              </span>
            )}
            <span className="flex items-center gap-1 whitespace-nowrap">
              <kbd className={KBD_CHIP}>Esc</kbd>
              <span>隐藏</span>
            </span>
          </div>

          {/* 右侧唤起热键 */}
          <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0 pl-2">
            {shortcutKeys(shortcut).map((k) => (
              <kbd key={k} className={KBD_CHIP}>
                {k}
              </kbd>
            ))}
            <span>唤起</span>
          </div>
        </div>
      </Command>
    </div>
  );
}

export function CommandPalette() {
  return (
    <ThemeProvider>
      <PaletteInner />
    </ThemeProvider>
  );
}
