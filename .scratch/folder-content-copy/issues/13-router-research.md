# 比较 Tauri 2 单页应用的路由方案

Type: research
Status: resolved

## 问题

针对使用 Tauri 2、React 和 TypeScript，且不需要服务端渲染的 Windows 桌面应用，比较 TanStack Router 和 React Router 在应用内功能路径及 CLI/AHK 外部激活方面的适用性。基于官方文档和代码仓库资料，评估平台支持、维护情况、深层路径兼容性和使用复杂度，并考虑用户对 TanStack Router 的偏好；本票据不实施路由。

## 答案

研究报告建议使用 **TanStack Router 客户端模式**，无需引入 TanStack Start 或服务端渲染。两种路由器均可满足单页导航，外部激活应由 Tauri 单实例及链接处理机制负责，再将校验后的应用内路径交给路由器。用户已在 [issue 18](18-choose-spa-router.md) 确认最终采用 TanStack Router，并要求功能路径支持冷启动和重新加载。

报告：[Tauri 2 桌面应用的单页路由与外部路径激活](https://github.com/GmavionR/KeyboardCommand/blob/research/spa-router/research/spa-router.md)，位于 `research/spa-router` 分支。
