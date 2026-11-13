# 09：Tauri 2 托盘、全局热键与独立面板窗口的主流做法调研

Type: research
Status: open
Label: ready-for-agent

## 问题

[issue 02](02-system-hotkey-and-invocation.md) 把系统级热键、托盘和可能的独立面板窗口拉进了范围，而这三项当前**一项都没有实现**。按 [`AGENTS.md`](../../../AGENTS.md) 的硬性要求，动手前必须先弄清主流怎么做。

需要调研并给出带一手来源的事实：

1. **全局快捷键**：`tauri-plugin-global-shortcut` 的当前版本、API、权限声明方式。注册被其他应用占用时的返回行为；能否检测冲突并给出可读原因；应用失焦与主窗口隐藏时是否仍然触发；Windows 上的已知限制。
2. **托盘**：Tauri 2 的托盘是内置 `TrayIconBuilder` 还是插件。图标、菜单、左键/双击事件的支持情况；「关闭主窗口即隐藏到托盘」的常见实现方式；托盘与 `single-instance` 插件如何配合。
3. **独立面板窗口**：用第二个 `WebviewWindow` 做一个无边框、不在任务栏显示、失焦自动隐藏、屏幕居中偏上的面板窗口，主流怎么做。相关窗口配置项（`decorations`、`skipTaskbar`、`alwaysOnTop`、`transparent`、`shadow`、`focus`）在 Windows 上的实际表现与坑。预创建隐藏窗口复用 vs 每次按需创建的取舍。
4. **窗口状态判定**：Tauri 能拿到哪些窗口状态（`isVisible`、`isMinimized`、`isFocused`）。Windows 上能否可靠判断「窗口被其他应用遮挡」和「窗口位于另一个虚拟桌面」；若不能，主流应用如何近似处理。跨虚拟桌面把窗口激活到前台的已知限制。
5. **参考产品**：Raycast、uTools、Quicker、PowerToys Run 在「主窗口隐藏时唤起面板」这件事上的形态选择——它们是一个独立窗口还是主窗口内的浮层？有没有两种形态并存的先例？

## 为什么单独成票

这是 [issue 10](10-presentation-form.md)、[issue 11](11-window-visible-definition.md)、[issue 12](12-tray-and-close-behavior.md)、[issue 13](13-hotkey-configuration.md) 的共同前置。用户对「场景 1 是不是一个 Windows 窗口」明确表示不确定，回答这个疑问需要平台能力的事实，不能靠猜。

**完成调研不代表选定方案**，形态决策仍在 issue 10。

## Comments

- 2026-11-13：从 issue 02 的用户答复中拆出。