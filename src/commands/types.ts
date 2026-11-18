/**
 * 命令面板核心类型定义
 *
 * 该模块定义了命令面板的完整类型体系：分类、类型、来源、执行上下文、
 * 命令项与动态 Provider 接口。
 *
 * 扩展规则：
 *   - 新增内置命令：在对应 Provider 文件的 getCommands() 中追加。
 *   - 新增用户自定义命令支持：实现 CommandProvider 接口创建新 Provider，
 *     注入 CommandRegistry 即可，无需修改命令面板渲染逻辑。
 */

/** 命令分类（支持内置固定分类与未来用户自定义分类扩展） */
export type CommandCategory =
  | '页面'
  | '操作'
  | '外观'
  | '设置'
  | '自定义'
  | (string & {});

/** 命令类型：跳转 / 动作 / 自定义 */
export type CommandType = 'jump' | 'action' | 'custom';

/** 命令来源：内置 / 功能 / 用户自定义 */
export type CommandSource = 'builtin' | 'feature' | 'user';

/**
 * 命令执行上下文
 *
 * 执行时由命令面板注入，命令本身无需 import 任何框架 API，
 * 保持命令定义的纯粹与可测试性。
 */
export interface CommandExecutionContext {
  /** 在主窗口执行客户端路由跳转 */
  navigate: (to: string) => Promise<void>;
  /** 激活主窗口并带到前台（show + unminimize + set_focus） */
  activateMainWindow: () => Promise<void>;
  /** 向全应用（跨 Webview）派发事件 */
  emitEvent: (event: string, payload?: unknown) => Promise<void>;
}

/** 统一命令项定义 */
export interface CommandItem {
  /** 全局唯一 ID，建议格式：`<provider>.<name>` */
  id: string;
  /** 命令面板展示名称 */
  title: string;
  /** 所属分类，决定面板内分组排列 */
  category: CommandCategory;
  /** 命令类型 */
  type: CommandType;
  /** 命令来源 */
  source: CommandSource;
  /** 英文别名与关键词，用于命令面板包含匹配 */
  aliases?: string[];
  /** 可选快捷键提示（纯展示用，不绑定实际监听） */
  shortcut?: string;
  /** 可选图标名称（供 UI 层解析渲染） */
  icon?: string;
  /** 用户自定义命令扩展参数（首版内置命令留空） */
  customPayload?: Record<string, unknown>;
  /** 命令执行逻辑 */
  run: (ctx: CommandExecutionContext) => void | Promise<void>;
  /** 可选：命令是否可执行（返回 false 时面板置灰） */
  canExecute?: () => boolean;
  /** canExecute 为 false 时的禁用原因说明 */
  disabledReason?: string;
  /** 单选项当前生效状态（如主题选项），生效时面板右侧展示 ✓ */
  checked?: boolean;
}

/**
 * 动态命令提供者接口
 *
 * 实现此接口并注入 CommandRegistry.register() 即可扩展命令面板。
 * getCommands 支持同步与异步两种形式，满足从本地状态读取
 * 或从 SQLite 异步拉取用户自定义命令的需求。
 */
export interface CommandProvider {
  /** Provider 唯一标识 */
  id: string;
  /** 返回该 Provider 管理的命令列表 */
  getCommands: () => CommandItem[] | Promise<CommandItem[]>;
}
