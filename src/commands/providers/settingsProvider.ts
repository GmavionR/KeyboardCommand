/**
 * SettingsProvider — 设置入口命令
 *
 * 输出「打开系统设置」与「打开当前功能设置」两条动作命令。
 * 两条命令均通过 emitEvent 向主窗口派发事件，主窗口负责监听响应。
 */

import type { CommandItem, CommandProvider } from '../types';

/** 派发给主窗口的「打开系统设置」事件名 */
export const OPEN_SYSTEM_SETTINGS_EVENT = 'kbc://open-system-settings';

/** 派发给主窗口的「打开当前功能设置」事件名 */
export const OPEN_PAGE_SETTINGS_EVENT = 'kbc://open-page-settings';

export const settingsProvider: CommandProvider = {
  id: 'builtin.settings',

  getCommands(): CommandItem[] {
    return [
      {
        id: 'settings.system',
        title: '打开系统设置',
        category: '设置' as const,
        type: 'action' as const,
        source: 'builtin' as const,
        aliases: ['settings', 'system', 'preferences', '系统设置', '设置'],
        icon: 'settings',
        run: async (ctx) => {
          await ctx.activateMainWindow();
          await ctx.emitEvent(OPEN_SYSTEM_SETTINGS_EVENT);
        },
      },
      {
        id: 'settings.page',
        title: '打开当前功能设置',
        category: '设置' as const,
        type: 'action' as const,
        source: 'builtin' as const,
        aliases: ['rules', 'config', '规则', '功能设置'],
        icon: 'sliders',
        run: async (ctx) => {
          await ctx.activateMainWindow();
          await ctx.emitEvent(OPEN_PAGE_SETTINGS_EVENT);
        },
      },
    ];
  },
};
