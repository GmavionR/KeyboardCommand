# 评估 Everything 的 es.exe 是否适合作为搜索加速器

Type: research
Status: resolved

## 问题

基于 voidtools 官方文档和 Everything 索引机制，评估 `es.exe` 是否适合作为 KbcApp 实时文件/文件夹搜索的可选加速器。确认其指定路径搜索、结果格式、服务运行条件、索引覆盖范围和更新时效；比较对已索引 NTFS 路径、未索引路径、可移动/网络目录的表现与回退需求。对照应用内遍历或复用 Rust 库，给出性能预期、部署依赖和用户体验方面的建议，不编写代码。

## 答案

官方文档确认 ES 支持路径限定和 JSON 输出，但依赖正在运行的 Everything，且仅能查询已索引项目。默认本地固定 NTFS 卷会被索引；未索引路径可能返回空结果而无法与“确实没有匹配项”区分。用户最初曾选择以 ES 为首选搜索后端，随后在 [issue 26](26-fd-search-availability-and-errors.md) 中改选用户自行安装的 `fd`，故本调研记录仅保留为历史比较，不再代表当前实现方向。

报告：[Everything `es.exe` 作为实时搜索加速器的评估](https://github.com/GmavionR/KeyboardCommand/blob/research/everything-es/research/everything-es.md)，位于 `research/everything-es` 分支。
