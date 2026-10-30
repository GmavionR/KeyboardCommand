# 比较复制历史快照的存储方案

Type: research
Status: resolved

## 问题

针对最多保留 20 条的 Windows Tauri 2 应用历史记录，每条包含完整复制文本、来源文件夹、选中文件路径和时间戳，比较使用 SQLite、逐条文件快照或混合方案的利弊。基于 Tauri 2、SQLite 和 Rust 生态的一手资料，推荐可靠的存储方式，并分析原子写入、损坏恢复、迁移及历史列表查询。

## 答案

研究报告建议当前使用**单个 SQLite 数据库**作为权威存储：以事务保存完整记录，便于按时间排序、限制数量和管理迁移。混合存储仅在正文文件需要独立导出或管理时才值得引入，会增加一致性修复成本。此结果是调研建议，最终选择仍由用户决定。

报告：[复制历史快照存储方案比较](https://github.com/GmavionR/KeyboardCommand/blob/research/history-storage/research/history-storage.md)，位于 `research/history-storage` 分支。
