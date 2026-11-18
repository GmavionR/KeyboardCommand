# 29：全局 ThemeProvider 提升与跨窗口实时双向主题同步

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

将 `ThemeProvider` 从 `FolderCopyApp` 提升至应用顶层根布局；在 `/palette` 独立 Webview 同样挂载 `ThemeProvider`；通过 Tauri 原生事件广播与共享存储实现主窗口与命令面板的双向实时主题联动。

## 详细交付要求

1. **提升 `ThemeProvider` 作用域**：
   - 将 `ThemeProvider` 移至 `src/main.tsx` 或 `src/router.tsx` 中的 `RootLayout` 外层，确保全应用所有路由页面、根级提示和弹窗均能正常调用 `useTheme()`；
   - 修复此前在根布局中直接调用 `useTheme()` 会抛错的隐患。
2. **面板 Webview 主题挂载**：
   - 独立命令面板 `/palette` Webview 入口同样包裹 `ThemeProvider`，读取相同的本地存储与系统暗色偏好。
3. **跨 Webview 实时事件同步**：
   - 当在命令面板中切换主题（如执行“外观：深色模式”）时：
     - 面板自身的 `<html>` 标签立即切换 `.dark` 类名；
     - 通过 `app.emit('theme-changed', mode)` 向全应用派发主题变更事件；
     - 主窗口监听到该事件后，立即更新自身状态与 `.dark` 类名，实现无刷新、无白屏的双向秒级同步；
   - 反之，在主窗口系统设置中修改主题时，面板同样实时同步。

## 验收条件

- [x] 在主窗口任何页面直接调用 `useTheme()` 均正常工作，不抛出缺少 Provider 的异常。
- [x] 命令面板在浅色与深色模式下，背景、文字、边框与高亮均能无缝适配现有 `slate/blue` 设计系统。
- [x] 切换命令面板外观为深色，面板立即变为深色，且主窗口在后台无刷新实时同步变为深色。
- [x] 切换命令面板外观为浅色，面板立即变为浅色，且主窗口同步变为浅色。
- [x] `bun run build` 编译通过。

## Blocked by

- [27：独立面板 Webview 窗口创建与失焦隐藏生命周期](27-standalone-palette-window.md)

## Comments

- 2026-11-18：实现完成。
  - `ThemeContext.tsx`：引入 `@tauri-apps/api/event` 的 `emit`/`listen`；`setThemeMode` 改为同时 `emit('kbc://theme-changed', mode)` 广播；新增 `useEffect` 监听跨 Webview 的 `kbc://theme-changed` 事件并更新本地状态，避免循环广播；`setThemeMode` 用 `useCallback` 稳定引用。
  - `main.tsx`：在 `RouterProvider` 外层包裹 `ThemeProvider`，使全部路由（`/folder-copy`、`/prompts`、`/palette`）均在同一 Provider 树中。
  - `App.tsx`：去除 `FolderCopyPage` 内原有的 `ThemeProvider` 包裹，避免双重 Provider 嵌套。
  - `bun run build`（`tsc && vite build`）零错误通过。
