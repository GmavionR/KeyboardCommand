# 30：可扩展命令注册表与路由单一来源架构

Type: task
Status: ready-for-agent
Label: ready-for-agent

## 要构建什么

收敛前端单一功能路由清单；实现面向未来的通用 `CommandItem` 契约抽象与 `CommandProvider` 动态提供者接口，原生支持后续挂载用户自定义命令配置；提供 `CommandRegistry` 注册中心，组装首版预置命令项。

## 详细交付要求

1. **路由元数据单一来源**：
   - 在 `src/config/routes.ts` 中集中定义功能路由及其元数据：
     ```ts
     export interface RouteMetadata {
       path: string;
       title: string;
       aliases: string[];
       category: '页面' | '操作' | '外观' | '设置';
     }
     ```
   - 路由树、TS 路由类型从该清单派生；Rust 侧白名单通过测试保持一致。
2. **命令与提供者抽象接口**：
   - 实现规范中定义的通用类型体系：
     - `CommandCategory`: `'页面' | '操作' | '外观' | '设置' | '自定义' | string`
     - `CommandType`: `'jump' | 'action' | 'custom'`
     - `CommandSource`: `'builtin' | 'feature' | 'user'`
     - `CommandExecutionContext`: `{ navigate, activateMainWindow, emitEvent }`
     - `CommandItem`: 包含 `id, title, category, type, source, aliases, shortcut, icon, customPayload, run, canExecute, disabledReason, checked`
     - `CommandProvider`: `{ id, getCommands() }`
3. **注册中心与内置提供者**：
   - 实现 `CommandRegistry`，聚合各 Provider 返回的命令列表；
   - 编写内置 Providers：
     - `BuiltinRouteProvider`: 输出「打开文件夹内容复制」与「打开 Prompts 页面」两条跳转命令；
     - `AppearanceProvider`: 输出「跟随系统」、「浅色模式」、「深色模式」三条外观命令，并标记当前生效项 `checked: true`；
     - `SettingsProvider`: 输出「打开系统设置」与「打开当前功能设置」两条动作命令；
     - `FolderCopyProvider`: 输出「打开文件夹...」核心动作命令（动作具体联动留在 issue 32 完善）；
4. **单元测试保护**：
   - 为 `CommandRegistry` 编写单元测试，验证命令的合并去重、分类分组、状态标记以及未来注入虚拟自定义 Provider 的兼容性。

## 验收条件

- [ ] 功能路径在应用中收敛为单一事实清单，新增路由只需修改一处。
- [ ] `CommandRegistry` 能正确加载所有内置 Provider，聚合产出首版命令清单。
- [ ] 动态 Provider 契约支持后续无侵入扩展 `UserCustomCommandProvider`。
- [ ] 单元测试通过，`bun run build` 编译通过。

## Blocked by

- [29：全局 ThemeProvider 提升与跨窗口实时双向主题同步](29-global-theme-elevation-and-sync.md)
