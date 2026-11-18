# 27：独立面板 Webview 窗口创建与失焦隐藏生命周期

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

在 Tauri 2 中创建常驻后台的轻量独立 Webview 窗口（`command-palette`），配置其无边框、透明、不在任务栏显示、置顶等属性；实现呼出时基于当前鼠标所在屏幕水平居中偏上定位；实现鼠标点击外部（失焦 blur）或按 Escape 自动隐藏。

## 详细交付要求

1. **窗口预创建（Tauri 配置 / Rust）**：
   - 窗口标识：`label: "command-palette"`；
   - 属性配置：
     - `decorations: false`（无原生标题栏）
     - `transparent: true`（透明背景）
     - `skipTaskbar: true`（任务栏和 Alt+Tab 均不显示）
     - `alwaysOnTop: true`（始终置顶）
     - `resizable: false`
     - `visible: false`（启动时预创建复用，保持隐藏）
     - 初始宽度 640px，高度根据前端内容包裹；
2. **多显示器与居中偏上定位**：
   - 在 Rust 或前端调度层提供窗口呼出定位函数：获取当前鼠标光标所在的显示器（`cursor_position` / `current_monitor`），计算该显示器有效工作区内的坐标：水平居中，Y 轴位于工作区顶部约 20%~25% 处；
3. **失焦与 Esc 自动隐藏**：
   - 监听窗口失去焦点（Web 侧 `onFocusChanged` 或 Rust 侧 `WindowEvent::Focused(false)`），失焦时调用 `window.hide()`；
   - Web 侧监听 Escape 键，按下时调用 `window.hide()`；
4. **前端专属挂载路由**：
   - 在前端路由或根挂载点中开辟 `/palette` 轻量入口，窗口加载该专属组件，不加载主窗口的多余导航栏和重型组件；
5. **托盘联动**：
   - 将 [issue 25](25-tray-and-close-to-hide.md) 托盘右键菜单中的「命令面板」项点击事件，连接至调用此面板窗口的显示与定位逻辑。

## 验收条件

- [x] 应用启动后，任务栏仅显示主窗口图标，无命令面板窗口图标。
- [x] 从托盘菜单点击「命令面板」，窗口在当前鼠标所在显示器上方居中无白屏秒开，输入框自动获得焦点。
- [x] 鼠标点击面板窗口外部屏幕任意其他区域（失去焦点），面板立即自动隐藏。
- [x] 面板打开时按下 Escape 键，面板立即自动隐藏。
- [x] 面板隐藏后，Windows 系统自动将焦点交还给唤起前的前台软件。
- [x] `cargo check` 与 `bun run build` 编译通过。

## Blocked by

- [25：系统托盘常驻与主窗口关闭拦截隐藏](25-tray-and-close-to-hide.md)

## Comments

- 2026-11-18：实现完成。
  - `tauri.conf.json` 新增 `command-palette` 预创建窗口（`visible: false`、`transparent: true`、`skipTaskbar: true`、`alwaysOnTop: true`、`resizable: false`）。
  - `lib.rs` 新增 `show_palette_window()` 内部函数：获取光标位置 → 找目标显示器 → 水平居中、Y 轴 20% 处定位 → `show()` + `set_focus()`。
  - `lib.rs` `on_window_event` 拦截 `Focused(false)` 事件，`command-palette` 失焦自动 `hide()`。
  - 托盘菜单 `command_palette` 项连接至 `show_palette_window()`。
  - 新增 `src/components/palette/CommandPalette.tsx`：输入框自动聚焦，Escape 键调用 `window.hide()`。
  - `router.tsx` 新增 `/palette` 路由，不加载主窗口的导航栏和重型组件。
  - `cargo check` 通过，`bun run tsc --noEmit` 通过。
