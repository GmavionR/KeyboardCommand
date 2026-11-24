# 38 - 后台空闲自动销毁 WebView 释放内存与按需重建

Type: task
Status: resolved
Label: ready-for-agent
Blocked by: 无

## 背景与问题

KeyboardCommand（KbcApp）的核心设计原则是轻量级桌面效率小工具，在内存占用和 CPU 消耗方面要求极为严格，理想情况下要求整体内存占用限制在 40MB 以下。

在 issue 25 中，应用实现了系统托盘常驻与点击主窗口右上角 `×` 拦截隐藏（`window.hide()`）。但 `window.hide()` 仅将窗口设为不可见，底层 Windows WebView2 的渲染工作集进程依然常驻于内存中（实测渲染进程物理工作集约为 143.66MB）。若长时间闲置在后台仍持续占用这部分内存，难以满足 40MB 的超轻量化目标。

若采取“一隐藏就立即 destroy() 窗口”，会导致用户刚关掉窗口又短时间内频繁唤起时，每次都需要重新冷启动 WebView2 引擎，产生不必要的白屏闪烁与延迟。

## 解决思路与架构方案

采用“**隐藏后延迟销毁（`destroy()`）WebView 窗口 + 托盘/快捷键按需重建**”的自适应平衡方案：
- 既能在长时间后台闲置时把 WebView2 渲染进程的物理内存彻底释放掉；
- 又不会在用户刚点开、短时间内频繁切换时白白重建，保持高频使用时的零延迟秒开。

### 核心机制拆解

1. **关闭/收起进入可取消倒计时**：
   - 拦截主窗口 `WindowEvent::CloseRequested` 或托盘单击收起时，先调用 `window.hide()` 隐藏窗口。
   - 启动一个 Tokio 异步延迟定时任务；开发构建固定 30 秒，发布构建从系统配置 `app_settings.idle_destroy_delay_seconds` 读取，默认 180 秒，可设为 30–3600 秒。
   - 若用户在配置时长内再次唤起窗口（托盘点击、托盘菜单、快捷键、CLI 或 WM_COPYDATA），立即中止（`handle.abort()`）定时销毁任务，直接 `show()` + `set_focus()`，零延迟秒开。
2. **超时未唤出才真正销毁**：
   - 定时器超时后，在后台任务中再次二次确认窗口确实处于不可见状态（`!win.is_visible()`），调用 `win.destroy()` 强制释放 WebView2 渲染进程实例。
   - 引入 `is_destroying` 标志位，确保在内部执行 `destroy()` 时放行关闭，避免 `CloseRequested` 再次递归触发 `hide()` 导致死循环。
3. **统一封装按需重建入口**：
   - 将主窗口激活收敛至 `show_or_recreate_main_window` 与 `toggle_main_window`；
   - 若窗口仍存活：取消待执行销毁定时器并直接恢复置前；
   - 若窗口已被销毁：基于 `WebviewWindowBuilder::from_config` 动态重新构建 `main` 窗口（继承窗口配置、图标与 Windows 原生 WM_COPYDATA 消息监听通道）；在独立阻塞任务中创建，以避开 Tauri 官方记录的 Windows 同步调用死锁问题；并发唤醒请求合并为一次重建。
4. **前端状态与路由无缝持久化**：
   - 窗口销毁重建会导致前端内存状态重置。通过 `localStorage` 自动记忆主窗口最近路由（`/folder-copy` 或 `/prompts`）与最近打开的文件夹路径，重建加载时自动恢复。
   - Rust 侧维护 `CurrentActivation(pub(crate) Mutex<ActivationRequest>)`，确保单实例传入的新请求在窗口动态重建后依然能准确消费。

## 涉及文件与实施变更

1. **Rust 依赖与核心运行时**：
   - `src-tauri/Cargo.toml`：添加 `tokio = { version = "1", features = ["time", "sync"] }` 依赖。
   - `src-tauri/src/lib.rs`：
     - 定义 `WindowLifecycleState`、`SharedLifecycle`、`CurrentActivation`。
     - 实现 `create_main_window`、`cancel_pending_destroy`、`schedule_idle_destroy`、`show_or_recreate_main_window`、`toggle_main_window`。
     - 改造 `on_window_event` 拦截、托盘事件、单实例唤醒、`show_main_window` 命令与 `--palette` 浮层模式启动逻辑。
     - 增加 `lifecycle_state_cancels_pending_handle` 与 `current_activation_updates_and_reads` 单元测试。
   - `src-tauri/src/windows_bridge.rs`：WM_COPYDATA 跨进程调度中改用 `crate::show_or_recreate_main_window(app)`。
2. **前端路由与工作区状态恢复**：
   - `src/router.tsx`：根路由重定向优先读取 `localStorage.getItem('kbc_last_route')`，支持无缝恢复到上次访问的功能页。
   - `src/main.tsx`：订阅路由解析完成事件，实时持久化最新非浮层路由。
   - `src/FolderCopyApp.tsx`：加载文件夹成功后记录 `kbc_last_active_folder`，挂载时自动重新载入该目录及对应选择历史。
   - `src/components/common/SystemSettingsModal.tsx`：在内存监控模块新增后台空闲优化说明标签，如实展示轻量化机制生效状态。

## 验收条件

- [x] 主窗口点击右上角关闭 `×` 或托盘单击隐藏后，启动配置时长的延迟定时器（开发固定 30 秒、发布默认 180 秒且可配置）。
- [x] 配置时长内再次点击托盘或通过快捷键唤起，定时器立即取消，窗口瞬时秒开且内容完好。
- [x] 隐藏超过配置时长后，后台自动执行 `win.destroy()`，释放 WebView2 渲染工作集内存。
- [x] 超时销毁后，再次通过托盘图标、托盘菜单、命令面板跳转、CLI 参数或 WM_COPYDATA 呼出，主窗口按原尺寸规格无感重建。
- [x] 重建后自动恢复上次停留在的功能路由与上次选中的工作区文件夹，无需用户手动重新选择。
- [x] 所有 41 项 Rust 单元测试全部通过（`cargo test --lib`）。
- [x] 前端 TypeScript 类型检查与构建全部通过（`bun run build`）。

## Comments

- 2026-11-24：设计并实施完成。经全量单元测试与构建验证通过，Status 置为 `resolved`。
- 2026-11-24：开发构建固定 30 秒；发布构建从系统设置的 `app_settings.idle_destroy_delay_seconds` 读取，默认 180 秒，允许配置 30–3600 秒；设置页和生命周期日志显示运行值。
- 2026-11-24：审查发现窗口重建路径的 WM_COPYDATA 子类监听需要在 HWND 所属线程安装；现通过主线程调度安装，窗口完成 hook 后再显示。销毁状态查询只有明确返回隐藏时才销毁，失败结果写入生命周期日志。
