# 选择应用内单页路由方案

Type: grilling
Status: resolved
Blocked by: 13

## 问题

结合路由方案调研，在 TanStack Router 和 React Router 中作出最终选择。确认采用纯客户端路由、不使用服务端渲染，并说明应用路径是否要支持冷启动和重新加载。

## 答案

- 选择 TanStack Router，采用纯客户端 SPA；不引入 TanStack Start，也不使用服务端渲染。
- 功能路径必须支持冷启动和重新加载时恢复到对应功能页。外部程序如何传递路径、单实例如何转交请求，由 [issue 19](19-choose-external-activation-protocol.md) 决定；路由选择不规定外部激活协议。
- 站内 URL 优先采用简洁路径（如 `/folder-copy`）。实现时须验证 Windows 打包后的 Tauri 应用在该深层路径下可冷启动并重载。如果深层路径无法可靠回退到应用入口，则使用哈希路径（如 `/#/folder-copy`）保证功能页恢复。
- 采用该方案依据 [issue 13 路由调研](13-router-research.md)：两种路由器均支持客户端 SPA；TanStack Router 的 TypeScript 类型安全能力更贴合当前方向，且符合用户偏好。
