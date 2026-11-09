# 46：将 playground 页面迁入桌面应用

**父票据：** [初始化桌面应用并接入现有页面](37-application-shell-and-ui.md)

**要构建：** 用户在桌面应用 `/folder-copy` 页面看到现有设计稿中的完整界面与交互，不再依赖单独的 playground 才能体验页面。

**阻塞于：** [初始化 Tauri 应用与功能路由](45-bootstrap-tauri-shell.md)

**状态：** completed
**标签：** completed

**设计来源：** `playground/KeyboardCommand_Folder_Copy/docs/design.md` 是当前 UI 与交互基准；原型中的 mock data 只用于页面展示和交互状态验证，后续票据会逐步接入真实 Rust 能力。

- [x] 将 playground 的页面组件、主题样式、设置弹窗、搜索、文件树、选择/历史面板、复制栏、预览与状态预设条迁入桌面应用。
- [x] 保持设计稿规定的布局、文案、键盘交互、菜单行为、反馈状态和窄窗口适配；不重新设计 UI。
- [x] 迁入后的页面在 Tauri 应用中可交互展示，构建时不依赖 playground 的运行服务。
- [x] mock 数据仅作为本票据的临时视觉/交互数据，不得被当作正式文件系统、SQLite 或历史结果；后续后端接入保留明确替换点。
- [x] 完成前运行 `ego-browser skill`，用 ego-browser 检视 playground 中对应页面和交互并对照 `docs/design.md`；再在桌面应用中手动验收迁入后的页面视觉及交互。

## 实现与验收记录

- 主流做法：沿用现有 React 组件与 Tailwind 样式迁移页面，保留 mock 数据作为 UI 开发阶段的临时适配层；Tauri 自定义标题栏使用官方窗口装饰配置、窗口权限与窗口 API。
- 设计基准：`playground/KeyboardCommand_Folder_Copy/docs/design.md` v1.3.0。原 playground 未修改。
- Rust 替换点：`src/FolderCopyApp.tsx` 中当前页面状态与操作回调，以及 `src/data/mockData.ts` 的临时数据；后续接入真实 Rust 命令时替换这些适配内容。
- 构建：`bun run build` 通过；未新增或运行自动化测试。
- ego-browser：检视 playground 主界面、设置弹窗和“13. 右键复制单文件”预设，对照设计稿并确认页面交互。
- 桌面手动验收：Tauri 窗口展示完整界面与自定义标题栏；上下键只移动聚焦；文件夹空格展开/折叠；文件空格切换勾选；可选文件右键打开“仅复制当前文件”，执行后选择数保持 4，历史数由 3 增至 4。
