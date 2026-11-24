# 提示词片段：产品规格地图

Type: map
Label: wayfinder:map
Status: resolved

## 目标

形成一份完整交付实现的产品技术规格，描述 KeyboardCommand 的**提示词片段（Prompt Snippets）**：
支持在主窗口管理本地 Markdown 提示词，并通过全局热键、命令行或 AHK V2 SendMessage（WM_COPYDATA）秒级唤起轻量快捷粘贴悬浮窗，复用单套浮层窗口以满足全局 40MB 内存限制。所有必要决策已通过 `/grill-with-docs` 彻底清晰收敛为 [`spec.md`](spec.md)；本地图已圆满达成共识。

## 备注

- 产品背景见 [`PROJECT_REQUIREMENTS.md`](../../PROJECT_REQUIREMENTS.md)。
- 内存约束见 [`AGENTS.md`](../../AGENTS.md)（严格控制在 40MB 以下，严禁引入重型组件）。
- 领域词汇定义见 [`GLOSSARY.md`](../../GLOSSARY.md)。
- 关键架构决策记录：
  - [ADR-0005: 统一复用单套独立浮层窗口以满足 40MB 内存限制](../../docs/adr/0005-unified-floating-overlay-and-prompt-snippets.md)
  - [ADR-0006: 采用 WM_COPYDATA 作为外部程序消息激活协议](../../docs/adr/0006-wm-copydata-external-activation.md)

## 已作决定

1. **功能与领域命名**：定名为「提示词片段」（Prompt Snippets），条目为「提示词」，触发词为「Keyword / command」，彻底与命令面板隔离。
2. **双层形态架构**：主窗口独立管理页（`/prompts`）+ 快捷粘贴悬浮窗。
3. **40MB 内存红线与浮层复用**：复用既有的命令面板独立无边框 Webview 浮层容器，多模式切换，零额外 Webview 进程开销（ADR-0005）。
4. **外部消息通道**：引入 Windows 原生 `WM_COPYDATA` (0x004A) 消息支持 AHK V2 毫秒级零延迟调度（ADR-0006）。
5. **按键拦截职责**：AHK V2 自主解析 Markdown 文件并绑定热字串；KbcApp 专注提供数据管理与快捷选择浮层。
6. **键盘焦点无冲突交互**：唤起时输入框保持聚焦，方向键与回车由列表接管，打字即搜，无需手动切焦点。
7. **数据存储规范**：用户自定义目录，每个提示词一个 `.md` 文件，YAML FrontMatter 存元数据，正文存 content。
8. **默认目录与预设**：默认使用 `%APPDATA%/KeyboardCommand/prompts/`，首次为空时自动内置高频实用示例。
9. **文件名与标题同步**：`[title].md` 严格同步，自动清洗非法字符，同名时提示覆写。
10. **剪贴板保护与发送机制**：剪贴板注入 + 模拟 `Ctrl+V`，延时 400ms 自动还原原剪贴板内容，防止数据冲掉。
11. **文件容错与优雅降级**：无 FrontMatter 则以文件名为标题、全文为内容；YAML 报错标记警告，不崩溃白屏。

## 规格文档

👉 **[`spec.md`](spec.md)**
