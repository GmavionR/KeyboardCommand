# 01：命令面板的术语与首版范围

Type: grilling
Status: resolved
Label: ready-for-agent

## 问题

用户提出「为 app 的某些功能增加全局搜索能力」，并给了一张 shadcn/ui 文档搜索框的截图作为视觉参考。但「搜索」一词在本仓库已被占用：文件夹浏览与复制功能中的「实时搜索」专指用 `fd` 按文件或文件夹自身名称做包含匹配（见 [folder-content-copy issue 53](../../folder-content-copy/issues/53-name-only-search.md)）。截图里的东西检索的是「可执行的东西」，不是文件内容，两者混称会让后续讨论跑偏。

需要定：这个东西叫什么，以及首版能检索并执行哪些东西。

## 答案

术语（已写入 [`GLOSSARY.md`](../../../GLOSSARY.md) 的「应用外壳」一节）：

- **命令面板**：整个界面的名字。
- **命令**：面板中一条可执行条目。
- **命令分类**：命令的归类名称。
- **跳转命令** / **动作命令**：命令的两个种类。

弃用「全局搜索」「搜索弹窗」这类叫法，避免与文件名称实时搜索撞车。

首版范围**只有两类命令**：

1. **跳转命令**：跳转到功能路径（当前为 `/folder-copy`、`/prompts`）。
2. **动作命令**：触发应用内已有动作——打开系统设置、打开本功能设置、选择文件夹、复制文件上下文包、切换主题。

**内容检索不进首版**：文件内容、复制历史、最近文件夹的检索都需要异步 provider、防抖、结果上限与加载态，是另一个量级的工程，留后续票据。

## Comments

- 2026-11-13：grilling 第一轮 Q1，用户答「agree」。
- 视觉参考图由用户提供，路径 `C:\Users\40294\.qoder\tmp\E--DevProjects-LocalProjects-tauriProjects-KeyboardCommand\images\d64f3679-5611-4a80-99c8-2a2d66e7f9c1\09ae906d-32d2-40ed-9b25-219543f53705.png`。
- 首版命令的**逐条清单、跨页面可用性与禁用态**尚未确定，见 [issue 20](20-command-inventory-and-availability.md)。