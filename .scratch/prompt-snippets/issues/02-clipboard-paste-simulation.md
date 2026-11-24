# 02：Windows 剪贴板注入与模拟粘贴发送

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

在 Rust 后端实现文本发送与剪贴板保护服务：
1. 记录唤起悬浮窗前的前台活动窗口句柄（`GetForegroundWindow`）；
2. 用户确认选定提示词后，浮层立即隐藏，将系统焦点归还原窗口；
3. 备份用户当前剪贴板文本内容；
4. 将提示词写入剪贴板；
5. Win32 模拟按键 `Ctrl + V` 触发粘贴；
6. 延时 400ms 后自动恢复原剪贴板文本，防止污染用户先前复制的内容。

## 验收条件

- [x] 提供 Tauri 命令 `paste_prompt(content: String, restore_clipboard: bool)`。
- [x] 剪贴板恢复正常执行，不影响外部窗口文本的接收。
- [x] 编译与功能全部通过。

