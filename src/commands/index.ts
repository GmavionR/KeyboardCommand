/**
 * 命令注册表出口模块
 *
 * 组装首版内置 Providers 并导出预配置的 CommandRegistry 实例。
 * 外观 Provider 因依赖运行时 themeMode，以工厂函数形式单独导出，
 * 由命令面板组件在渲染时按需创建并注入。
 */

export { CommandRegistry } from './registry';
export type {
  CommandItem,
  CommandProvider,
  CommandCategory,
  CommandType,
  CommandSource,
  CommandExecutionContext,
} from './types';

export { builtinRouteProvider } from './providers/builtinRouteProvider';
export { folderCopyProvider, OPEN_FOLDER_EVENT } from './providers/folderCopyProvider';
export { createAppearanceProvider } from './providers/appearanceProvider';
export { settingsProvider, OPEN_SYSTEM_SETTINGS_EVENT, OPEN_PAGE_SETTINGS_EVENT } from './providers/settingsProvider';
export * from './dispatcher';

import { CommandRegistry } from './registry';
import { builtinRouteProvider } from './providers/builtinRouteProvider';
import { folderCopyProvider } from './providers/folderCopyProvider';
import { settingsProvider } from './providers/settingsProvider';

/**
 * 全局共享的命令注册表实例（不含外观 Provider，外观 Provider 在渲染时动态注入）。
 *
 * 用法示例（命令面板组件内）：
 * ```ts
 * const registry = new CommandRegistry();
 * registry
 *   .register(builtinRouteProvider)
 *   .register(folderCopyProvider)
 *   .register(createAppearanceProvider(themeMode))
 *   .register(settingsProvider);
 * const commands = await registry.getCommands();
 * ```
 */
export function createDefaultRegistry() {
  return new CommandRegistry()
    .register(builtinRouteProvider)
    .register(folderCopyProvider)
    .register(settingsProvider);
}
