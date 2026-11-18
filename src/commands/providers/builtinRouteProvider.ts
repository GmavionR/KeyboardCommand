/**
 * BuiltinRouteProvider — 内置页面跳转命令
 *
 * 输出「打开文件夹内容复制」与「打开 Prompts 页面」两条跳转命令。
 * 命令元数据由 src/config/routes.ts 中的 APP_ROUTES 派生，保持单一来源。
 */

import { APP_ROUTES } from '../../config/routes';
import type { CommandItem, CommandProvider } from '../types';

export const builtinRouteProvider: CommandProvider = {
  id: 'builtin.routes',

  getCommands(): CommandItem[] {
    return APP_ROUTES.map((route) => ({
      id: `route.${route.path}`,
      title: route.title,
      category: '页面' as const,
      type: 'jump' as const,
      source: 'builtin' as const,
      aliases: route.aliases,
      icon: 'arrow-right',
      run: async (ctx) => {
        await ctx.activateMainWindow();
        await ctx.navigate(route.path);
      },
    }));
  },
};
