# 讨论项目初始化工具配置

Type: grilling
Status: resolved

## 问题

仓库目前主要是产品与设计文档，尚未初始化应用源码。开始搭建 Tauri 2、React、TypeScript 项目前，需要确定统一的开发工具和初始化约定：

- 前端包管理器是否采用 `pnpm`，以及如何固定包管理器和版本；
- Node.js 版本与版本管理方式；
- Rust 工具链版本和更新策略；
- React、TypeScript 与 Vite 的初始化模板；
- 常用开发、构建、格式化、静态检查和测试脚本；
- 是否在初始化阶段配置 lint、格式化、类型检查、测试和提交前检查。

## 调研背景

Tauri 2 官方 `create-tauri-app` 提供 React、TypeScript 与 `pnpm` 选项；Tauri 的 SPA 前端指南推荐 React 等 SPA 使用 Vite。官方也支持通过 `package.json` scripts 统一开发和构建命令。这些是可参考的主流起点，不代表用户已经选定。[Tauri 创建项目](https://v2.tauri.app/start/create-project/)、[Tauri 前端配置](https://v2.tauri.app/start/frontend/)、[Tauri 配置文件](https://v2.tauri.app/develop/configuration-files/)

## 答案

- 使用 Tauri 官方 `create-tauri-app` 初始化，选择 React、TypeScript 和 pnpm，沿用 Vite 基础配置；之后接入已确定的 TanStack Router。
- pnpm 是唯一的前端包管理器。Node.js 和 pnpm 均不写入版本固定配置，直接使用当前开发环境中的版本；不设置 `packageManager` 版本固定字段或 Node 版本文件。
- 使用 `rust-toolchain.toml` 固定初始化时采用的 Rust 稳定版精确版本，并声明 Windows MSVC 编译目标和构建所需组件。Rust 工具链不自动漂移；定期或因依赖/功能需要时手动升级。
- 保留脚手架自带的开发和构建命令，不额外配置格式化、lint、类型检查、前端或 Rust 测试、端到端测试或统一 `check` 命令。
- 不配置 Git 提交前自动检查。

## Comments

- 用户确认不固定 Node.js 与 pnpm 版本，直接使用当前环境。
- 用户确认不配置额外质量检查、测试工具和提交钩子；此决定取代此前同意的通用质量脚本建议。
