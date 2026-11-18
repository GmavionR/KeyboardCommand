import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * CommandPalette — 轻量命令面板组件
 *
 * 生命周期：
 * - 窗口由 Rust 预创建（visible: false），呼出时通过 show_palette 命令定位并显示。
 * - 失焦自动隐藏：由 Rust 侧 WindowEvent::Focused(false) 处理。
 * - 按 Escape 隐藏：前端监听 keydown 事件。
 * - 窗口加载后自动聚焦输入框。
 */
export function CommandPalette() {
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape 键隐藏窗口
  useEffect(() => {
    const appWindow = getCurrentWindow();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        void appWindow.hide();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen items-start justify-center bg-transparent p-0">
      <div className="w-full max-w-[640px] overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/95 shadow-2xl backdrop-blur-sm">
        {/* 搜索输入框 */}
        <div className="flex items-center border-b border-slate-700/60 px-4 py-3">
          <svg
            className="mr-3 h-5 w-5 shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="输入命令或搜索…"
            className="w-full bg-transparent text-base text-slate-100 placeholder-slate-500 outline-none"
          />
          <kbd className="ml-3 shrink-0 rounded border border-slate-600 px-1.5 py-0.5 text-xs text-slate-400">
            Esc
          </kbd>
        </div>

        {/* 占位提示 */}
        <div className="px-4 py-6 text-center text-sm text-slate-500">
          命令注册表将在 #30 实现
        </div>
      </div>
    </div>
  );
}
