# 17：命令注册表与功能路径的单一事实来源

Type: grilling
Status: open
Label: needs-triage

## 问题

功能路径白名单目前**散在三处，各自独立维护**：

- [`src/main.tsx:13`](../../../src/main.tsx)：`const supportedRoutes = new Set(["/folder-copy", "/prompts"])`
- [`src-tauri/src/lib.rs:109`](../../../src-tauri/src/lib.rs)：`validate_route` 的 match 分支，另有 `DEFAULT_ROUTE = "/folder-copy"`
- [`src/router.tsx`](../../../src/router.tsx)：`createRoute` 的路由树

命令面板需要每条跳转命令带上**路径 + 显示名 + 分类 + 英文别名**，如果再加一份清单，就变成**四处**。新增一个功能页要改四个地方，漏一处就出现「路由存在但面板搜不到」或「面板能搜到但外部激活被拒」。

需要定：

- 是否借这次把功能路径清单**收敛为单一事实来源**（一份带元数据的清单，路由树、TS 白名单、命令面板都从它派生）。
- **Rust 侧怎么共享**：Rust 需要独立校验外部激活请求。选项包括构建期从同一份 JSON/TS 生成 Rust 常量、Rust 侧保留独立白名单但加测试保证一致、或把校验完全交给前端（Rust 只转发）。
- **动作命令怎么注册**：动作的实现分散在 `FolderCopyApp` 等组件内部（打开设置弹窗、复制、选择文件夹）。是集中式注册表由各处上报回调，还是各功能模块导出自己的命令清单？前者要处理组件卸载后的注销，后者要处理跨页面时动作不可用的情况。
- **注册表的形状**：命令的稳定 id、显示名、分类、别名、执行函数、可用性判定。
- 命令面板在 `/prompts` 页时，folder-copy 的动作命令怎么处理——见 [issue 20](20-command-inventory-and-availability.md)。

## 相关事实

- 应用内导航目前**没有用 `useNavigate`**，而是 [`main.tsx:19`](../../../src/main.tsx) 里响应 `activation-request` 事件时调用 `router.navigate({ to })`。命令面板的跳转是否复用同一条路径（即发一个内部激活请求），还是直接调 `router.navigate`，也在本票决定。
- 复用外部激活那条路径的好处是：校验、错误提示、窗口激活逻辑只有一份。

## Comments

- 2026-11-13：grilling 第一轮时列为下游问题，未及提问。用户外出，留待下次讨论。
- 本票不阻塞于呈现形态，因为无论哪种形态都需要命令清单。