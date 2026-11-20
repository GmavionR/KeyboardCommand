import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
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

const PALETTE_WIDTH = 640;
const DEFAULT_SHORTCUT = "Ctrl+Shift+K";

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
// 命令图标：优先按命令 id 定制，其余按 icon 字段映射
// ─────────────────────────────────────────────
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

/** 标题展示：分类前缀独立成弱化标签，去掉标题内重复的「外观：」 */
function displayTitle(item: CommandItem): string {
  return item.category === "外观"
    ? item.title.replace(/^外观：/, "")
    : item.title;
}

/** 热键字符串拆成按键 chip（Super 展示为 Win） */
function shortcutKeys(shortcut: string): string[] {
  return shortcut
    .split("+")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => (k === "Super" || k === "Meta" ? "Win" : k));
}

const KBD_CHIP =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-pal-border bg-pal-raised px-1.5 font-mono text-[10px] font-medium text-pal-muted-fg shadow-[0_1px_0_var(--pal-border)]";

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

interface ShortcutStatusInfo {
  shortcut: string;
  registered: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────
// 核心面板（需 ThemeProvider 包裹）
// ─────────────────────────────────────────────
function PaletteInner() {
  const { themeMode } = useTheme();
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT);
  // 失焦（隐藏）时重挂载面板重置 cmdk 选中态，让高度收敛在隐藏期间完成
  const [session, setSession] = useState(0);
  const appWindow = getCurrentWindow();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 加载命令列表（依赖 themeMode 以更新 checked 状态）
  useEffect(() => {
    const registry = createDefaultRegistry().register(
      createAppearanceProvider(themeMode),
    );
    void registry.getCommands().then(setCommands);
  }, [themeMode]);

  // 读取当前唤起热键，并跟随设置修改实时刷新
  useEffect(() => {
    void invoke<ShortcutStatusInfo>("get_shortcut_status")
      .then((info) => setShortcut(info.shortcut))
      .catch(() => {});
    let unlisten: (() => void) | undefined;
    void listen<ShortcutStatusInfo>("palette-shortcut-changed", ({ payload }) => {
      setShortcut(payload.shortcut);
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => {
      unlisten?.();
    };
  }, []);

  // 重置发生在失焦（即隐藏）期间：搜索清空、选中态归位、窗口高度收敛都在
  // 隐藏时完成；显示时仅聚焦输入框，避免_show 后重挂载造成空白闪与二次 resize 抖动
  useEffect(() => {
    function onFocus() {
      inputRef.current?.focus();
    }
    function onBlur() {
      setQuery("");
      setSession((s) => s + 1);
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // 隐藏页的渲染帧被暂停，ResizeObserver 回调会推迟到显示之后；
  // 这里在提交后同步量高设尺寸，保证窗口在隐藏期间就收敛到正确高度
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const height = Math.ceil(el.getBoundingClientRect().height);
    void appWindow
      .setSize(new LogicalSize(PALETTE_WIDTH, height))
      .catch(() => {});
  }, [appWindow, session, query, commands]);

  // 窗口高度随内容紧凑包裹（透明窗口不留空白点击陷阱）
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = Math.ceil(entries[0].contentRect.height);
      void appWindow
        .setSize(new LogicalSize(PALETTE_WIDTH, height))
        .catch(() => {});
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [appWindow, session]);

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
    <div
      className="flex min-h-screen items-start justify-center bg-transparent"
      onMouseDown={(e) => {
        // 点击面板外的透明区域视为失焦意图，直接隐藏
        if (e.target === e.currentTarget) hidePalette();
      }}
    >
      <Command
        key={session}
        ref={rootRef}
        className="w-full max-w-[640px] overflow-hidden rounded-[20px] bg-pal-surface shadow-palette backdrop-blur-2xl"
        loop
        // 禁用 vim 绑定（cmdk ≥1.x 默认不启用，明确传 false 保险）
        vimBindings={false}
        shouldFilter={false}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Escape") hidePalette();
        }}
      >
        {/* 搜索输入框 */}
        <div className="flex items-center gap-3 border-b border-pal-border px-5">
          <Search className="size-5 shrink-0 text-pal-muted-fg" />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="搜索命令或功能…"
            className="h-14 flex-1 bg-transparent text-[15px] text-pal-fg outline-none placeholder:text-pal-muted-fg"
          />
          <kbd className={KBD_CHIP}>esc</kbd>
        </div>

        {/* 命令列表 */}
        <Command.List className="palette-scroll max-h-[382px] overflow-y-auto overscroll-contain p-2 scroll-py-2">
          <Command.Empty className="py-8 text-center text-sm text-pal-muted-fg">
            没有搜索到匹配命令
          </Command.Empty>

          {groups.map(({ category, items }) => (
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
                    {/* 选中态左侧品牌色指示条 */}
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-pal-brand opacity-0 transition-opacity group-aria-selected:opacity-100" />

                    {/* 图标块：选中时反转为品牌色底 */}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-pal-border bg-pal-raised text-pal-muted-fg transition-colors group-aria-selected:border-transparent group-aria-selected:bg-pal-brand group-aria-selected:text-pal-on-brand">
                      <Icon className="size-4" />
                    </span>

                    {/* 标题（含分类弱化前缀与命中高亮） */}
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

                    {/* 快捷键提示 */}
                    {item.shortcut && (
                      <span className="flex shrink-0 gap-1">
                        {shortcutKeys(item.shortcut).map((k) => (
                          <kbd key={k} className={KBD_CHIP}>
                            {k}
                          </kbd>
                        ))}
                      </span>
                    )}

                    {/* 状态图标：checked → ✓，jump → ↵ */}
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
        </Command.List>

        {/* 底部指引条：左侧操作提示，右侧当前唤起热键 */}
        <div className="flex items-center gap-4 border-t border-pal-border bg-pal-muted/40 px-4 py-2.5 text-xs text-pal-muted-fg">
          <span className="flex items-center gap-1.5">
            <kbd className={KBD_CHIP}>
              <ArrowUp className="size-3" />
            </kbd>
            <kbd className={KBD_CHIP}>
              <ArrowDown className="size-3" />
            </kbd>
            选择
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={KBD_CHIP}>
              <CornerDownLeft className="size-3" />
            </kbd>
            执行
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={KBD_CHIP}>esc</kbd>
            隐藏
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            {shortcutKeys(shortcut).map((k) => (
              <kbd key={k} className={KBD_CHIP}>
                {k}
              </kbd>
            ))}
            唤起
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