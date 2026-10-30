# 硬性要求：使用中文记录

# 功能实现规范

**任何代码/逻辑/功能，动手前先回答「业界主流怎么做的」**， 找最受欢迎的 GitHub 实现或成熟平台的做法，**模仿或复用，而不是从零手搓。**

不熟悉的功能别从零写，先去GitHub/exa 搜开源项目对比思路再动手


## 项目背景和需求

涉及项目背景、产品需求或设计决定时，先阅读 [`PROJECT_REQUIREMENTS.md`](./PROJECT_REQUIREMENTS.md)。

## 工程 Skills

### 问题跟踪器

本项目使用 `.scratch/<feature-slug>/` 下的 Markdown 文件记录问题和规格。约定见 [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)。

### 分类标签

使用默认的五个分类标签。映射见 [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md)。

### 领域文档

本仓库采用单一领域上下文；使用根目录的 `GLOSSARY.md` 和 `docs/adr/`。规则见 [`docs/agents/domain.md`](docs/agents/domain.md)。
