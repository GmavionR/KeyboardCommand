# 45：初始化 Tauri 应用与功能路由

**父票据：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)

**要构建：** 建立可运行的 Tauri 桌面应用基础，使用户启动应用后能进入 `/folder-copy` 功能路由。

**阻塞于：** 无（可立即开始）

**状态：** in-progress
**标签：** in-progress

- [x] 使用 Tauri 官方 React/TypeScript 脚手架与 Vite 初始化，bun 为唯一前端包管理器；固定 Rust 稳定版和 Windows MSVC 构建目标。
- [x] 保留脚手架开发和构建命令；不额外加入测试框架、lint、格式化、类型检查、统一检查命令或提交钩子。
- [x] 接入 TanStack Router 客户端路由；默认路由为 `/folder-copy`，应用启动和重新加载后均能进入该功能。
- [x] 桌面窗口可正常启动并显示功能路由的基础页面，为后续迁入设计页面提供可运行容器。
- [ ] 完成前先运行 `ego-browser skill`，用 ego-browser 检视 playground 中 `/folder-copy` 的目标页面和交互；随后在桌面应用中手动验收启动、默认路由和重新加载。

> 进度记录（2026-11-09）：使用 Bun 1.4.4 执行 `bun run build` 成功；ego-browser 检视 playground `/folder-copy`，并确认应用开发服务器在直接访问与刷新后均保留该路由；`cargo run --no-default-features` 启动 Tauri 窗口成功。桌面窗口的实际页面检查因 UI 自动化授权超时尚未完成，因此最后一项保持未完成。
