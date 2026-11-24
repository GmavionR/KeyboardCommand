# 04：统一独立浮层多模式支持与快捷粘贴悬浮窗

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

在既有的 `command-palette` 独立浮层窗口上支持模式切换：
1. 支持模式状态：`palette`（命令面板）与 `prompt-picker`（提示词快捷粘贴选择器）；
2. 提示词选择器视图：顶部搜索框（打开即聚焦）、即时过滤、上下方向键无冲突切换项、Enter 确认发送、Esc 退出；
3. 纯键盘交互与流畅体验。

## 验收条件

- [x] 浮层窗口可以无缝切换为提示词选择器。
- [x] 方向键和 Enter 操作丝滑，无焦点冲突。

