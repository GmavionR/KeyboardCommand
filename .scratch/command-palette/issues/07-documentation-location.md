# 07：讨论结论的落点与词汇表更新

Type: grilling
Status: resolved
Label: ready-for-agent

## 问题

命令面板的讨论结论记在哪里。`.scratch/` 当时只有 `folder-content-copy` 一个 effort，票号已到 56。命令面板属于**应用外壳**，不属于文件夹复制功能，混进去会让那个已收敛的 effort 重新发散。

## 答案

- 新建 effort 目录 `.scratch/command-palette/`，按 [`docs/agents/issue-tracker.md`](../../../docs/agents/issue-tracker.md) 的约定组织：本 `map.md` + `issues/NN-<slug>.md`，**票号从 01 重新开始**（每个 effort 独立编号）。
- 已确认的决定写成 `Status: resolved` 的 `Type: grilling` 票据，答案放在 `## 答案` 下，并在 `map.md` 的「已作决定」中留摘要与链接。
- 尚待讨论的问题写成 `Status: open` 票据，用 `Blocked by:` 标注前置依赖，并在 `map.md` 的「尚未决定的 Issue」中同步列出。
- [`GLOSSARY.md`](../../../GLOSSARY.md) 的「应用外壳」一节补入命令面板相关术语。
- **暂不写 `spec.md`**：呈现形态等核心问题未定，现在写规格会是猜测。待前沿问题清空后再收敛成规格。

## Comments

- 2026-11-13：grilling 第一轮 Q7，用户答「agree」。
- 同日用户外出，要求先把本轮决议落地到文档、剩余问题留待下次讨论，本 effort 的初始文档即按此建立。