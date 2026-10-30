# 问题跟踪器：本地 Markdown

本项目的问题和规格都以 Markdown 文件保存在 `.scratch/` 中。

## 文件约定

- 每项工作一个目录：`.scratch/<feature-slug>/`
- 规格文件：`.scratch/<feature-slug>/spec.md`
- 实施票据每项单独存放于 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号，不把多项票据合并到一个文件中
- 每份票据顶部附近用 `Status:` 记录状态；标签角色及其名称见 `triage-labels.md`
- 评论和讨论历史追加在文件末尾的 `## Comments` 标题下

## 发布到问题跟踪器

当某个 Skill 要求“发布到问题跟踪器”时，在 `.scratch/<feature-slug>/` 下创建新文件；目录不存在时一并创建。

## 获取相关票据

当某个 Skill 要求“获取相关票据”时，读取用户给出的路径。用户通常会直接提供文件路径或票据编号。

## Wayfinder 地图操作

`/wayfinder` 使用一张地图和多份子票据：

- **地图**：`.scratch/<effort>/map.md`，记录目标、备注、已作决定、尚未明确和范围外事项。
- **子票据**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 编号，正文写一个待回答的问题。`Type:` 记录类型（`research`、`prototype`、`grilling`、`task`）；`Status:` 记录状态（`claimed`、`resolved`）。
- **尚未明确**只放目前还无法表述成具体问题的范围内雾区；已能清楚提出的问题必须单独建票据。地图中的“尚未决定的 Issue”区域同步列出所有 `Status: open` 票据，方便总览；各票据正文仍是问题详情的唯一事实来源。完成一项 `research` 票据表示调研完成，不表示产品方案已选定。
- **阻塞关系**：在票据顶部附近写 `Blocked by: NN, NN`。列出的票据全部变为 `resolved` 后，该票据才解除阻塞。
- **前沿票据**：在 `.scratch/<effort>/issues/` 中查找状态为开放、未阻塞、未认领的票据；编号最小的优先。
- **认领**：开始工作前先将 `Status:` 改为 `claimed` 并保存。
- **解决**：在 `## Answer` 下追加答案，将 `Status:` 改为 `resolved`，再在 `map.md` 的“已作决定”中追加指向该票据的简短摘要和链接。
