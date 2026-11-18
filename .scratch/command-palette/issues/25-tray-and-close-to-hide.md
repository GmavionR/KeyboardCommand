# 25：系统托盘常驻与主窗口关闭拦截隐藏

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

在 Tauri 2 中启用原生系统托盘，实现「点击主窗口 × 隐藏到托盘、托盘图标左键单击激活主窗口、右键菜单彻底退出」的标准桌面后台驻留行为。

## 详细交付要求

1. **依赖与配置**：
   - 在 `src-tauri/Cargo.toml` 中开启 `tauri = { version = "2", features = ["tray-icon"] }`。
2. **托盘创建（Rust）**：
   - 在 `src-tauri/src/lib.rs` 的 setup 阶段，通过 `tauri::tray::TrayIconBuilder` 与 `tauri::menu::MenuBuilder` 构建托盘；
   - 图标使用 `app.default_window_icon()`；
   - 悬浮提示文案为 `KeyboardCommand`；
   - 禁用左键默认弹出菜单（`.show_menu_on_left_click(false)`），并在 `.on_tray_icon_event` 中监听 `MouseButton::Left` 单击事件：若主窗口已在前台显示则隐藏，若主窗口隐藏或在后台则调用 `show()`、`unminimize()`、`set_focus()` 激活置前；
   - 右键菜单包含：
     - `show_main`: 「显示主窗口」
     - `command_palette`: 「命令面板」
     - 分隔线
     - `quit`: 「退出」（调用 `app.exit(0)`）。
3. **主窗口关闭拦截**：
   - 监听主窗口 `WindowEvent::CloseRequested` 事件，调用 `api.prevent_close()` 阻止窗口销毁，调用 `window.hide()` 隐藏到托盘；
   - 仅托盘菜单中的「退出」项调用 `app.exit(0)` 时真正退出进程。

## 验收条件

- [x] 点击主窗口右上角 ×，主窗口立即隐藏，系统任务栏图标消失，托盘区域保留 KeyboardCommand 图标，后台进程不退出。
- [x] 鼠标左键单击托盘图标，主窗口立即从隐藏状态恢复并激活到前台；再次单击托盘图标主窗口隐藏。
- [x] 鼠标右键单击托盘图标，弹出包含「显示主窗口 / 命令面板 / 退出」的上下文菜单。
- [x] 点击右键菜单中的「退出」，应用程序完全退出并终止进程。
- [x] `cargo check` 与 `cargo test --lib` 编译通过无错误（27 项测试全部通过）。

## Blocked by

None (can start immediately)

## Comments

- 2026-11-18：已在 `src-tauri/Cargo.toml` 开启 `features = ["tray-icon"]`，在 `src-tauri/src/lib.rs` 中完整接入 `TrayIconBuilder` 与 `MenuBuilder`，并在 `on_window_event` 中拦截 `CloseRequested` 事件实现静默隐藏。编译与单元测试全部通过。
