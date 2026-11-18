# 12：托盘语义与主窗口关闭行为

Type: grilling
Status: resolved
Label: ready-for-agent

## 决议

采用 Windows 桌面效率工具的标准托盘行为模式：

1. **主窗口点 × = 隐藏到系统托盘**：
   - 监听 Tauri 主窗口的 `WindowEvent::CloseRequested` 事件，调用 `api.prevent_close()` 拦截窗口销毁，并调用 `window.hide()` 将其隐藏。
   - 应用主进程及后台服务保持运行，全局热键继续有效。
2. **彻底退出途径**：
   - 仅能通过托盘图标右键菜单中的「退出」项（调用 `app.exit(0)`）彻底关闭退出应用程序。
3. **托盘鼠标左键单击行为**：
   - 单击系统托盘图标：若主窗口已显示且在前台，则隐藏；若主窗口隐藏或在后台，则执行 `window.show()` + `window.unminimize()` + `window.set_focus()` 将主窗口激活到前台。
4. **托盘右键上下文菜单**：
   - 提供标准菜单项：
     - 「显示主窗口」
     - 「命令面板」（点击可直接唤出命令面板窗口）
     - 分隔线
     - 「退出」
5. **技术选型**：
   - 使用 Tauri 2 原生内置的 `tauri::tray::TrayIconBuilder` 与 `tauri::menu::MenuBuilder`，零新增外部第三方 Rust 依赖。

## Comments

- 2026-11-18：用户在 Grilling 第二轮明确确认本决议。
