# 17：命令注册表与功能路径的单一事实来源

Type: grilling
Status: resolved
Label: ready-for-agent

## 决议

### 1. 功能路径单一事实清单

- 在前端定义单一的功能路由配置清单（包含 `path`、`title` 显示名、`aliases` 英文别名、`category` 所属分类等元数据）；
- TanStack Router 路由树、命令面板的跳转命令均由此配置派生，消除多处硬编码维护成本；
- Rust 侧白名单保持一致校验。

### 2. 具备高度扩展性的命令注册与执行接口设计

为了原生支持未来可能增加的**用户自定义命令配置页面**（用户可自行增删改查命令、配置快捷动作/脚本/外部调用），命令体系采用 **`CommandItem` 契约抽象 + `CommandProvider` 动态提供者** 架构：

```ts
/** 命令归属分类 */
export type CommandCategory = '页面' | '操作' | '外观' | '设置' | '自定义' | (string & {});

/** 命令类型 */
export type CommandType = 'jump' | 'action' | 'custom';

/** 命令来源 */
export type CommandSource = 'builtin' | 'feature' | 'user';

/** 命令执行上下文（提供标准能力注入） */
export interface CommandExecutionContext {
  /** 路由跳转至指定功能页 */
  navigate: (to: string) => Promise<void>;
  /** 激活并将主窗口恢复至前台 */
  activateMainWindow: () => Promise<void>;
  /** 派发跨窗口或全局事件 */
  emitEvent: (event: string, payload?: unknown) => Promise<void>;
}

/** 统一命令项定义 */
export interface CommandItem {
  /** 稳定全局唯一 ID（内置命令为静态字符串，用户自定义命令可为 UUID/自增 ID） */
  id: string;
  /** 显示标题 */
  title: string;
  /** 命令分类（用于面板分组与排序） */
  category: CommandCategory;
  /** 命令类型 */
  type: CommandType;
  /** 命令来源：内置 / 功能特性 / 用户自定义 */
  source: CommandSource;
  /** 英文别名或检索关键词（包含匹配） */
  aliases?: string[];
  /** 快捷键提示文本（可选，仅作 UI chip 显示） */
  shortcut?: string;
  /** 图标标识（可选，支持 Lucide 图标名或自定义图标路径） */
  icon?: string;
  /** 自定义元数据（为用户自定义命令预留，例如脚本内容、命令行参数、目标 URL 等） */
  customPayload?: Record<string, unknown>;
  /** 执行函数 */
  run: (ctx: CommandExecutionContext) => void | Promise<void>;
  /** 是否可用（禁用态判定，可选） */
  canExecute?: () => boolean;
  /** 禁用原因说明（用于 tooltip 或辅助文本） */
  disabledReason?: string;
  /** 是否处于选中/生效态（用于主题等单选互斥项显示打勾 ✓） */
  checked?: boolean;
}

/** 动态命令提供者接口 */
export interface CommandProvider {
  /** 提供者唯一标识，例如 'builtin-routes', 'folder-copy', 'user-custom-commands' */
  id: string;
  /** 获取当前提供者注册的所有命令列表（支持同步或异步从 SQLite 读取） */
  getCommands: () => CommandItem[] | Promise<CommandItem[]>;
}
```

### 3. 命令注册中心（CommandRegistry）

- **统一注册与组装**：命令面板不直接写死所有命令，而是向 `CommandRegistry` 获取命令；
- **原生支持用户自定义命令接入**：
  - 首版注册 BuiltinRouteProvider、AppearanceProvider、SettingsProvider、FolderCopyProvider；
  - 后续实现“自定义命令配置页面”时，只需挂载一个 `UserCustomCommandProvider`（从 SQLite 读取用户配置的命令，将其映射为 `source: 'user'` 的 `CommandItem`），命令面板无需改动任何核心逻辑即可自动支持用户自定义命令的检索与执行。

## Comments

- 2026-11-18：用户特别要求规划好命令显示/执行接口，确保未来用户自定义命令可无缝接入，架构据此强化升级。
