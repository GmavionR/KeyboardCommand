# 14：与 issue 54 的边界，以及现有两个快捷键是否升级为系统级

Type: grilling
Status: resolved
Label: ready-for-agent

## 决议

1. **基础设施归属划分**：
   - **全局热键与系统托盘基础设施全权归本 effort（command-palette）实施**。命令面板是第一个真正需要系统级常驻与快捷唤起的核心消费者。
   - [folder-content-copy issue 54](../../folder-content-copy/issues/54-autostart-notification-and-global-hotkey.md) 范围收窄为「开机自启配置与桌面通知」，并在其需求中注明直接复用本 effort 建立的托盘与热键基础设施，避免两边各做一半。
2. **现有两个快捷键保持应用内监听**：
   - `Ctrl+Shift+C`（复制文件上下文包）与 `Ctrl+F`（聚焦文件搜索）**继续保持为应用内快捷键**，不升级为系统级全局热键。
   - 理由：`Ctrl+Shift+C`（浏览器开发者工具检查元素）、`Ctrl+F`（全系统通用查找）如果作为系统级全局热键注册，会导致与其他前台软件严重冲突。仅命令面板热键作为系统级热键。
3. **缺陷修复纳入本 effort**：
   - 顺带修复 `Ctrl+F` 判断中未排除 shift 的既有逻辑问题（在实现命令面板或 issue 23 时一并修正）。

## Comments

- 2026-11-18：用户在 Grilling 第二轮明确确认本决议。
