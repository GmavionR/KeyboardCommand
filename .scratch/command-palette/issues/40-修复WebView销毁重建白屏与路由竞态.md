# 40 - 修复WebView销毁重建白屏与路由竞态

Type: bug
Status: resolved
Label: ready-for-agent
Blocked by: 无

## 背景与问题

在 issue 38 实现“后台空闲 180 秒自动销毁 WebView 释放内存”后，实际运行测试中出现以下严重 Bug：
```text
[2026-11-24 14:30:15.280] [LIFECYCLE] [WINDOW_SHOW] 主窗口实例仍存活，直接恢复置前并聚焦
[2026-11-24 14:30:31.153] [LIFECYCLE] [IDLE_TIMER_STARTED] 主窗口已隐藏，启动 180 秒空闲销毁倒计时
[2026-11-24 14:33:31.159] [LIFECYCLE] [WINDOW_DESTROYED] 主窗口隐藏闲置达到阈值（180s），调用 win.destroy() 销毁 WebView 实例并释放物理工作集内存
[2026-11-24 14:35:49.346] [LIFECYCLE] [WINDOW_RECREATE_TRIGGERED] 主窗口已处于销毁状态，触发按需重新构建
```
销毁后，从托盘或命令面板唤出/跳转指定页面时，主窗口变成整个纯白屏，且右上角的自定义 TitleBar（关闭/最小化按钮）完全未渲染。

## 根本原因剖析

通过排查与源码对照，定位到三个致命诱因：

1. **手动窗口构建器导致开发模式 URL 加载失败（核心致白根因）**：
   在 `src-tauri/src/lib.rs` 的 `create_main_window` 中硬编码了：
   `WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::App("index.html".into()))`。
   在 `tauri dev` 模式下，前端资源由 Vite 运行在 `http://localhost:1420`。硬编码的 `WebviewUrl::App("index.html".into())` 强制 WebView2 从打包后的 `dist/index.html` 嵌入资源读取，在本地开发调试阶段找不到对应服务端或请求 404，导致 WebView2 显示默认空白页。且因为窗口配置为无原生边框（`decorations: false`），React 页面未成功挂载时自定义 TitleBar 无法渲染，导致整个窗口呈现纯白色。
   - **官方标准解法**：遵循 Tauri v2 官方规范，使用 `WebviewWindowBuilder::from_config(app, window_config)`。它自动根据当前环境切换 `devUrl`（`http://localhost:1420`）与 `frontendDist`，并完美继承 `tauri.conf.json` 中配置的窗口尺寸、无边框、无阴影、额外浏览器内核参数等全部属性。

2. **前端 React 根节点挂载被异步 IPC 阻塞**：
   在 `src/main.tsx` 原逻辑中，`ReactDOM.createRoot().render()` 被放置在 `async function bootstrap()` 的最底部，被多个 `await listen`、`await initMainWindowDispatcher`、`await invoke("initial_activation")` 阻塞。
   一旦有任何 IPC 耗时或异常，整个 DOM 树一直保持空白。
   - **解法**：将 React 根节点挂载提取为同步立即执行，确保页面加载瞬间先挂载 `<ThemeProvider><RouterProvider router={router} /></ThemeProvider>`，TitleBar 与应用骨架第一时间呈现；异步 IPC 监听与路由就绪则在后台静默完成。

3. **命令面板跨窗口路由竞态（Event Dropped Race Condition）**：
   当主窗口被销毁时，命令面板调用 `await invoke("show_main_window")` 后立即发送 `await emit("kbc://navigate", to)`。
   此时新建窗口的 WebView 正在启动加载，尚未执行到 `listen("kbc://navigate")`，导致该跳转事件直接丢失。
   - **解法**：
     - 在 Rust 侧拓展 `show_main_window(route: Option<String>)` 命令，直接在创建窗口前更新 `CurrentActivation` 状态；
     - 在命令面板派发前，预先写入 `localStorage.setItem("kbc_last_route", to)` 和 `localStorage.setItem("kbc_pending_action", event)`；
     - 重建后的主窗口在 TanStack Router 初始化与 `initMainWindowDispatcher` 阶段均能无缝承接该目标路由与待处理动作。

## 修复内容

1. **Rust 窗口重建采用官方 `from_config` 机制**：
   - 更新 `src-tauri/src/lib.rs` 中的 `create_main_window`：
     ```rust
     let window_config = app
         .config()
         .app
         .windows
         .iter()
         .find(|w| w.label == MAIN_WINDOW_LABEL)
         .ok_or_else(|| tauri::Error::WindowNotFound)?;
     let mut builder = WebviewWindowBuilder::from_config(app, window_config)?;
     ```
   - 在 `tauri.conf.json` 的主窗口配置中明确添加 `"label": "main"`。
   - 移除无用导入 `WebviewUrl`。

2. **Rust `show_main_window` 支持携带路由参数**：
   - 增加 `route: Option<String>`，当传入目标路径时同步更新 `CurrentActivation`，以便重建窗口首次激活时通过 `initial_activation` 自动导航到目标页。

3. **前端 `src/main.tsx` 同步挂载 React 并防御性处理异常**：
   - 页面执行时立即同步调用 `ReactDOM.createRoot(rootEl).render(...)`，杜绝任何白屏可能。
   - 对 `listen`、`initMainWindowDispatcher`、`initial_activation` 增加 `try...catch` 防御。

4. **命令面板与调度器（Dispatcher）跨生命周期可靠握手**：
   - 在 `src/components/palette/CommandPalette.tsx` 中同步暂存 `kbc_last_route` 和 `kbc_pending_action`；
   - 在 `src/commands/dispatcher.ts` 的 `initMainWindowDispatcher` 中检测并消费未决动作（如打开文件夹对话框、打开系统设置等）。

## 验收条件

- [x] 主窗口在 180s 销毁后重新创建时，能够根据当前开发或生产环境正确加载 URL，彻底消除白屏现象。
- [x] 重建窗口自定义 TitleBar、最小化与关闭按钮正常显示和交互。
- [x] 从命令面板或托盘跳转到特定页面（如提示词库 `/prompts`）时，重建后的主窗口能准确抵达目标页面，无事件丢失。
- [x] 所有 41 个 Rust 单元测试和前端 TypeScript/Vite 构建全部通过。

## Blocked by

无

## Comments

- 2026-11-24：修复完成。采用 `from_config` 标准窗口构建、React 同步挂载与持久化路由意图，全面解决销毁重建白屏与事件竞态问题。Status 置为 `resolved`。
- 2026-11-24：审查交付时发现 `from_config` 仍从同步事件回调中直接调用，Tauri 官方文档注明 Windows 下可能死锁。重建现改由后台阻塞任务创建并合并并发请求；WM_COPYDATA 导航现在先更新 Rust 激活路由，再发送主窗口实际监听的 `kbc://navigate` 事件。
- 2026-11-24：重建后的 WM_COPYDATA 子类监听改为调度到 HWND 所属 UI 线程安装；主窗口等待 hook 安装完成后才显示，避免跨线程子类化失败与消息交接窗口期。
