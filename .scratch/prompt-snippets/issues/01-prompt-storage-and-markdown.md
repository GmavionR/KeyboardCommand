# 01：Rust 端提示词文件存储、FrontMatter 解析与预设种子

Type: task
Status: resolved
Label: ready-for-agent

## 要构建什么

在 Rust 后端实现提示词文件的管理模块 `prompt_store.rs`：
1. 默认数据目录解析（优先从用户配置读取，默认使用应用数据目录下的 `prompts/`，即 `%APPDATA%/KeyboardCommand/prompts/`）；
2. 首次启动检测目录为空时，自动写入内置常用 Prompt 预设示例（如详细解释、总结归纳、代码重构优化等）；
3. 提示词文件读取与轻量 YAML FrontMatter 解析，容错降级（无 FrontMatter 时以文件名作为 title、全文作为 content；YAML 报错标记警告不崩溃）；
4. 提供 Tauri 命令：`list_prompts`、`save_prompt`、`delete_prompt`、`get_prompts_dir`、`set_prompts_dir`、`reveal_prompt_file`、`open_prompt_file`。

## 验收条件

- [x] 正确读取并解析包含 FrontMatter 的 `.md` 文件，提取 `title`、`command` 和正文内容。
- [x] 目录为空时自动生成内置预设提示词文件。
- [x] 支持保存、修改标题（自动重命名文件并清洗非法字符）、删除。
- [x] `cargo check` 与单元测试全部通过。

