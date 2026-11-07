# 37：初始化桌面应用并接入现有页面

**要构建：** 建立可启动的 Tauri 桌面应用，将现有文件夹复制页面接入 `/folder-copy` 路由，并支持命令行冷启动及单实例激活。

**阻塞于：** 无（可立即开始）

**状态：** ready-for-agent
**标签：** ready-for-agent

**设计来源：** `playground/KeyboardCommand_Folder_Copy/docs/design.md` 是页面 UI 与交互的当前基准；功能约束见 `.scratch/folder-content-copy/spec.md`。playground 中的 mock data 仅作视觉与交互参考。

- [ ] 使用 Tauri 官方 React/TypeScript 脚手架初始化，bun 为唯一前端包管理器；保留脚手架开发和构建命令，不增加未批准的测试或质量工具。
- [ ] 将 playground 页面迁入应用并呈现设计稿中的标题栏、工具栏、搜索、文件树、辅助面板、底部操作栏、设置弹窗和状态预设条；不重新设计 UI。
- [ ] 使用 TanStack Router 客户端路由；无参数启动打开 `/folder-copy`，冷启动 `--route` 和应用内导航支持已注册功能路径。
- [ ] 使用 Tauri 官方单实例能力转交后续启动参数；有效请求显示、恢复、聚焦窗口并导航，无效冷启动回退默认页并提示，运行中无效请求保留当前页面并提示。
- [ ] 逐条完成前，先运行 `ego-browser skill` 并用 ego-browser 检视 playground 对应页面和交互；对照设计稿后，在桌面应用中手动验收本票据的实际路由和激活流程。
