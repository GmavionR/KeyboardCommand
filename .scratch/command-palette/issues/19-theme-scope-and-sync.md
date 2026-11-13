# 19：主题作用域与跨窗口主题同步

Type: grilling
Status: open
Label: needs-triage
Blocked by: 10

## 问题

命令面板要在**所有路由**都可用，但主题提供者的作用域目前不覆盖全应用：

- [`ThemeContext.tsx`](../../../src/context/ThemeContext.tsx) 把 `.dark` 类写在 `document.documentElement` 上，模式存 `localStorage['kbc_theme_mode']`，并用 `matchMedia` 跟随系统明暗。
- [`App.tsx:5`](../../../src/App.tsx) 的 `ThemeProvider` **只包住 `FolderCopyPage`**，也就是只覆盖 `/folder-copy` 路由。
- [`router.tsx:16`](../../../src/router.tsx) 的 `RootLayout` 在它**外面**，所以在根布局里调 `useTheme()` 会直接抛错。
- `/prompts` 页是硬编码深色（`bg-slate-950`），不接主题。
- 项目**没有 CSS 设计令牌**，颜色全是字面量 `slate/blue/amber` 加 `dark:` 成对写法。

需要定：

- **`ThemeProvider` 是否提升到根布局或 `main.tsx`**，让命令面板和 `/prompts` 都能用主题。若提升，`/prompts` 的硬编码深色要不要一并改成跟随主题。
- 若命令面板只用 `dark:` 变体而不调 `useTheme()`，可以不提升——但「切换主题」这条动作命令需要写入主题状态，仍要访问 provider。
- **独立窗口形态下主题如何同步**：面板是另一个 webview 入口，`.dark` 类写在它自己的 `documentElement` 上。两个窗口的 `localStorage` 是否同源共享、变更能否实时通知另一个窗口（`storage` 事件跨 webview 是否触发），需要核实。若不共享，主题状态要改由 Rust 侧或事件广播。
- 面板挂载在根布局时，**主题切换命令执行后面板自身是否立即变色**。

## Comments

- 2026-11-13：grilling 第一轮时列为下游问题，未及提问。用户外出，留待下次讨论。
- 不阻塞的部分（ThemeProvider 是否提升）其实可以先定，但跨窗口同步取决于形态，故整票阻塞于 issue 10。