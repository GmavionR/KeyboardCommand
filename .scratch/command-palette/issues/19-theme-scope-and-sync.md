# 19：主题作用域与跨窗口主题同步

Type: grilling
Status: resolved
Label: ready-for-agent

## 决议

1. **`ThemeProvider` 提升到全局顶层**：
   - 将 `ThemeProvider` 从 `FolderCopyPage` 提升到应用根级入口（`main.tsx` 或 `router.tsx` 的 `RootLayout`）；
   - 使所有路由（包含未来页面）以及根级挂载的逻辑均可直接调用 `useTheme()`，消除此前在根布局调用会抛错的隐患。
2. **跨窗口主题实时同步**：
   - 独立命令面板 Webview 同样挂载 `ThemeProvider`；
   - 借助 Tauri 事件广播（`app.emit('theme-changed', mode)`）与 Webview 共享的 `localStorage` 机制：
     - 当在命令面板中执行“切换深色/浅色/跟随系统”动作时，面板自身立即切换 `.dark` 类与配色，同时向主窗口广播；
     - 主窗口监听到事件后同步更新自身外观，反之亦然。无需重启或刷新即可实现秒级双向同步。
3. **视觉变量统一**：
   - 命令面板完全复用既有的 Tailwind v4 `slate` / `blue` 配色规则，支持深浅模式无缝切换。

## Comments

- 2026-11-18：用户在 Grilling 第三轮确认本决议。
