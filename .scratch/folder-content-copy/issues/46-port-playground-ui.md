# 46：将 playground 页面迁入桌面应用

**父票据：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)

**要构建：** 用户在桌面应用 `/folder-copy` 页面看到现有设计稿中的完整界面与交互，不再依赖单独的 playground 才能体验页面。

**阻塞于：** [初始化 Tauri 应用与功能路由](45-bootstrap-tauri-shell.md)

**状态：** ready-for-agent
**标签：** ready-for-agent

**设计来源：** `playground/KeyboardCommand_Folder_Copy/docs/design.md` 是当前 UI 与交互基准；原型中的 mock data 只用于页面展示和交互状态验证，后续票据会逐步接入真实 Rust 能力。

- [ ] 将 playground 的页面组件、主题样式、设置弹窗、搜索、文件树、选择/历史面板、复制栏、预览与状态预设条迁入桌面应用。
- [ ] 保持设计稿规定的布局、文案、键盘交互、菜单行为、反馈状态和窄窗口适配；不重新设计 UI。
- [ ] 迁入后的页面在 Tauri 应用中可交互展示，构建时不依赖 playground 的运行服务。
- [ ] mock 数据仅作为本票据的临时视觉/交互数据，不得被当作正式文件系统、SQLite 或历史结果；后续后端接入保留明确替换点。
- [ ] 完成前先运行 `ego-browser skill`，用 ego-browser 检视 playground 中对应页面和交互并对照 `docs/design.md`；再在桌面应用中手动验收迁入后的页面视觉及交互。
