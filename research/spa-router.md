# Tauri 2 桌面应用的 SPA 路由与外部路由激活

研究日期：2026-10-30

## 结论

建议采用用户偏好的 **TanStack Router**，用于单页应用中的功能 URL、内部导航和类型安全的参数解析。项目不需要 TanStack Start：官方把 TanStack Router 定位为可独立使用的客户端路由器；其默认 browser history 使用浏览器 History API，也提供 hash 与 memory history。React Router 同样适用，且库模式成熟、生态更大；但对本项目仅需客户端路由而言，TanStack Router 的类型安全路径、搜索参数校验等能力更贴合 TypeScript 项目。选型不会解决 Windows 单实例和外部激活，这部分应由 Tauri 插件处理，再将解析出的应用内路径交给路由器导航。

## SPA 与 SSR 支持

| 项目 | 官方支持情况 | 对本应用的影响 |
|---|---|---|
| TanStack Router | 独立 Router 文档描述客户端路由和 history 类型；SSR 是可选的独立集成说明。TanStack Start 是另一个带服务端能力的框架，其 SPA 模式可关闭服务端 loader/组件执行。 | 直接使用 `@tanstack/react-router` 和 Vite/Tauri 前端即可；无需引入 Start 或 SSR 配置。 |
| React Router | 官方支持多种使用策略。Declarative/Data 模式可以自行设计 SPA；Framework 模式另有 SPA Mode，通过 `ssr: false` 禁用运行时 SSR，但仍会在构建时渲染 root 生成 `index.html`。 | 可用 React Router 的轻量库模式；若选择 Framework Mode，构建期 root 预渲染和框架约定会增加与 Tauri 静态资源构建的集成考量。 |

因此，“SPA”不意味着必须选某个专用框架。对于本项目现有 React + TypeScript + Tauri 2 技术方向，纯客户端路由是自然方案。无需服务端路由数据加载或 SSR；目录扫描、SQLite/文件读写等应由 Tauri commands 提供。

## URL 与导航

TanStack Router 默认采用 `createBrowserHistory`，官方还列出 `createHashHistory` 和 `createMemoryHistory`。Browser history 使用 Web History API，URL 路径清晰，适合 `/<feature>` 形式；Hash history 可避开对静态资源路径重写的依赖，但 URL 会成为 `/#/<feature>`。React Router 的 declarative/data API 也支持客户端导航，SPA Mode 文档说明同一 HTML 文件可为任意应用路径提供入口。

Tauri 桌面包并非普通 Web 服务器：直接访问或重载 `/feature` 是否始终回退到入口 HTML，取决于 Tauri 前端资源的打包和协议行为。当前资料不足以把 browser history 的重载/深层路径恢复视作已验证能力。若路径仅在应用运行期间用于导航，browser history 仍可作为默认候选；若要求冷启动、外部脚本持久传递目标路径，建议使用固定自定义 URI scheme 携带目标路径（如 `kbcapp://open/folder-copy`），收到后提取并校验路径，再调用 router 的导航 API。将 URI 直接当作站内 HTTP URL 并不必要。

## 外部激活和单实例

Tauri 官方 Deep Link 插件说明：Windows/Linux 上协议链接以 CLI 参数交给新进程；若需唯一实例接收事件，应启用 `tauri-plugin-single-instance` 的 `deep-link` feature，并把 Single Instance 插件作为第一个注册插件。Deep Link JS API 提供启动时读取 `getCurrent` 和运行中监听 `onOpenUrl`；参考 API 标明 Windows/Linux 没有 Single Instance 插件时不支持运行中接收事件。Tauri 同时警告：命令行参数可伪造协议 URL，因此应用应验证 scheme 和预期格式。

建议将职责分为：

1. CLI/AHK 启动注册好的 `kbcapp://...` URI。
2. Tauri deep-link 插件识别协议；single-instance 插件把第二次启动的 URL/参数送到已运行实例。
3. 前端统一解析、校验并归一化为应用内路由（例如 `/folder-copy`），等待路由器就绪后执行导航。

这样 TanStack Router 与 React Router 都能接收同一个内部路径，不需要路由器了解进程间通信。若采用 `kbcapp.exe --url /folder-copy` 纯命令行形式，单实例回调能接到新启动的参数，但不能假设 Tauri 会自动将任意参数转为 deep-link 事件；需由 Rust/单实例回调解析参数并传给前端。完整 Windows CLI/AHK 行为及安装后协议注册属于 Tauri 激活研究范围，须以对应票据继续确定。

## 维护、活跃度和复杂度

截至研究日，官方 GitHub 仓库页面显示：TanStack/router 约 15.1k stars，发布记录显示 2026-10-22 仍有新版本（包含 `@tanstack/react-router` 1.170.46）；新 issue 持续出现。remix-run/react-router 约 56.6k stars，仓库页面显示 11,243 次提交、约 11M 使用量，官方 release 页面显示 2026-10-19 发布 v8.5.0。两者均为活跃维护项目；React Router 的受众和采用面明显更大，但 stars/下载量不能单独证明对本桌面应用的适配更好。

复杂度评估（基于官方 API/模式的推断）：

- **TanStack Router：中等。** 文件路由可生成 route tree，需要配置生成器；优势是路径、params、search params 类型约束强。也可使用 code-based routes 避免文件生成。对少量功能页，不启用 TanStack Start/SSR 可控制概念数量。
- **React Router：低到中等。** Declarative 模式可用简单 route 配置，熟悉度与生态更高。Framework SPA Mode 会引入额外构建配置和 root 预渲染要求；无需时选择库模式可减轻负担。
- **外部激活：无论路由器是哪一个，均为单独的中等复杂度。** 需 Tauri deep-link + single-instance 插件、启动/运行中事件衔接、路由器就绪时机、参数验证和 Windows 安装协议注册；框架选择不能替代这些工作。

## 推荐决策

为符合用户现有偏好并充分利用 TypeScript，建议规格写为 **TanStack Router（客户端 SPA，不使用 TanStack Start/SSR）**。首版路径可采用 browser history；外部激活采用已注册自定义 URI scheme，经 Tauri deep-link 与 single-instance 机制送达前端，再导航到内部路由。若后续打包验证发现 browser history 冷启动或刷新回退不稳定，再评估 hash history。React Router 是可信备选，主要理由是生态规模与简单 declarative API，而不是 Tauri 集成优势。

## 一手来源

- [TanStack Router：History Types](https://tanstack.com/router/latest/docs/guide/history-types) — 默认 browser history 与 browser/hash/memory history。
- [TanStack Router：SSR guide](https://tanstack.com/router/latest/docs/guide/ssr) — SSR 的独立服务端处理路径。
- [TanStack Start：Selective SSR / SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr) — Start 的 SPA 模式关闭服务端 loader 和组件执行。
- [TanStack Router GitHub](https://github.com/TanStack/router) 与 [Releases](https://github.com/TanStack/router/releases) — 仓库规模和 2026-10-22 发布活动。
- [React Router：SPA Mode](https://reactrouter.com/how-to/spa) — Framework Mode SPA 配置与构建时 root 预渲染。
- [React Router：Pre-rendering](https://reactrouter.com/how-to/pre-rendering) — `ssr:false` 下的单 HTML 与路径恢复机制。
- [React Router GitHub](https://github.com/remix-run/react-router) 与 [Releases](https://github.com/remix-run/react-router/releases) — 仓库规模、使用量与 v8.5.0 发布记录。
- [Tauri 2：Deep Linking 插件](https://v2.tauri.app/plugin/deep-linking/) — Windows/Linux 启动参数传递及 single-instance 配合方式。
- [Tauri 2：Deep Link JS API](https://v2.tauri.app/reference/javascript/deep-link/) — `getCurrent`、`onOpenUrl` 和平台限制。
- [Tauri 2：Single Instance 插件](https://v2.tauri.app/plugin/single-instance/) — 单实例机制及新启动参数回调。

## 证据限制

GitHub stars、release 日期、仓库提交/使用量来自官方仓库页面的动态展示，可能随时间变化。此比较未运行 Tauri 打包验证，也未验证具体安装包在 Windows 上对未知子路径刷新的行为；文中对该行为明确保留为需要实现阶段验证的集成点。
