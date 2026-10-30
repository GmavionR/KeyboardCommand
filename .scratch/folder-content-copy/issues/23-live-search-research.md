# 调研成熟文件浏览与实时搜索的实现方式

Type: research
Status: resolved

## 问题

比较成熟工具中的目录内文件/文件夹实时搜索模式，重点查看 VS Code 文件快速打开、`fd`、`fzf` 和 `ripgrep` 等项目的一手文档、源代码及 GitHub 活跃度。说明名称/路径匹配、模糊匹配、增量结果、排序和目录树定位分别如何处理；判断这些命令行工具适合作为开发期参考、应用运行依赖，还是只应复用底层算法/库。结合 Windows Tauri 2 应用与实时结果列表需求给出建议，不编写代码。

## 答案

VS Code 将快速打开列表和目录树过滤作为两种不同交互：前者按名称/路径模糊匹配并排序，后者保留树层级并定位匹配项。`fd`、`fzf` 和 `ripgrep` 可供开发时参考；它们的命令行进程不适合作为桌面应用的运行依赖。应用应由自身提供实时结果列表，后端可评估复用 Rust 遍历、忽略规则或模糊评分库。

报告：[成熟文件浏览与实时搜索方案调研](https://github.com/GmavionR/KeyboardCommand/blob/research/live-search/research/live-search-patterns.md)，位于 `research/live-search` 分支。

## 后续选型

本调研原建议不把 `fd`、`fzf`、`rg` 命令行进程作为应用运行依赖。用户在 issue 22 中进一步决定实时搜索使用其自行安装的 `fd`；该用户决策取代了本调研对 `fd` 运行依赖的建议。应用不打包 fd；不可用时禁用搜索并提示用户安装。
