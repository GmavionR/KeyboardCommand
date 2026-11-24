# 03：Windows WM_COPYDATA 消息激活通道

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

实现支持 AutoHotkey V2 等外部脚本通过 `SendMessage(0x004A, ...)` 发送 `WM_COPYDATA` 消息给 KbcApp：
1. 在 Windows 窗口过程中监听 `WM_COPYDATA`；
2. 解析传入的 JSON 指令（如 `{"action":"show_picker","mode":"prompts"}` 或 `{"action":"navigate","route":"/prompts"}`）；
3. 调度浮层窗口呈现或主窗口路由跳转；
4. 毫秒级响应，零网络端口、零额外内存。

## 验收条件

- [x] Rust 成功捕获并解析 `WM_COPYDATA`。
- [x] 能正确唤起提示词选择器或导航到 `/prompts`。

