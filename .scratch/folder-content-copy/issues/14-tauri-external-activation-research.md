# 调研 Tauri 2 在 Windows 上的单实例和外部激活方式

Type: research
Status: resolved

## 问题

Tauri 2 在 Windows 上有哪些受支持的机制可以保证单实例运行，并将外部请求的功能路径交给现有实例？调研官方插件/API 对 CLI 和 AutoHotkey 集成的约束，比较可行方案并提出建议。

## 答案

研究报告建议通过 Tauri 官方 single-instance 插件将第二次启动的参数转发给已运行实例，再由应用统一解析并交给路由入口。首版外部激活最终选择及 CLI/AHK 参数格式已在 [issue 19](19-choose-external-activation-protocol.md) 决定：采用参数方式，URI Scheme 留待未来有需要时再评估。

报告：[Tauri 2 Windows 单实例与外部激活方案](https://github.com/GmavionR/KeyboardCommand/blob/research/tauri-activation/research/tauri-activation.md)，位于 `research/tauri-activation` 分支。
