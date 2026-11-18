# 15：独立窗口形态的关闭与焦点行为

Type: grilling
Status: resolved
Label: ready-for-agent

## 决议

采用 Spotlight / Raycast 标准的浮层窗口失焦与关闭交互：

1. **Escape 键行为**：
   - 按下 Escape 键时，面板窗口调用 `hide()` 隐藏；
   - 隐藏后保留 Webview 状态，输入内容在下次唤起时自动清空并重置高亮索引。
2. **失焦自动隐藏（Blur to Hide）**：
   - 监听窗口失去焦点事件（Web 侧 `onFocusChanged` 或 Rust 侧 `WindowEvent::Focused(false)`），当用户点击面板窗口外部的屏幕任意位置或其他应用程序时，面板窗口立即自动 `hide()`。
3. **热键 Toggle**：
   - 当面板已处于显示状态时，再次按下全局唤起热键，直接将面板 `hide()`（Toggle 机制）。
4. **命令执行后关闭**：
   - 执行「跳转命令」：面板立即隐藏，主窗口执行 `show() + unminimize() + set_focus()` 激活到前台并切换路由；
   - 执行「动作命令」：执行该动作后面板立即隐藏。
5. **焦点恢复**：
   - 面板窗口关闭隐藏后，Windows 系统自动将焦点交还给唤起命令面板前处于活动状态的第三方前台窗口。
6. **任务栏与 Alt+Tab**：
   - 面板窗口配置 `skipTaskbar: true`，不出现在系统任务栏中，也不出现在 Alt+Tab 任务切换列表中，保持轻量挂件体验。

## Comments

- 2026-11-18：用户在 Grilling 第三轮确认本决议。
