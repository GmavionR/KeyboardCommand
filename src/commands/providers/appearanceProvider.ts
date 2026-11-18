/**
 * AppearanceProvider — 外观主题切换命令
 *
 * 输出「跟随系统」、「浅色模式」、「深色模式」三条外观命令。
 * 因为 checked 状态依赖 themeMode 运行时值，该 Provider 以工厂函数
 * 形式提供，由命令面板组件在渲染时传入当前 themeMode 创建实例。
 */

import type { ThemeMode } from '../../context/ThemeContext';
import type { CommandItem, CommandProvider } from '../types';

/** 跨 Webview 广播主题变更的事件名（与 ThemeContext 保持一致） */
const THEME_EVENT = 'kbc://theme-changed';

export function createAppearanceProvider(currentThemeMode: ThemeMode): CommandProvider {
  return {
    id: 'builtin.appearance',

    getCommands(): CommandItem[] {
      return [
        {
          id: 'appearance.system',
          title: '外观：跟随系统',
          category: '外观' as const,
          type: 'action' as const,
          source: 'builtin' as const,
          aliases: ['theme', 'system', 'auto', '主题', '跟随系统'],
          icon: 'monitor',
          checked: currentThemeMode === 'system',
          run: async (ctx) => {
            await ctx.emitEvent(THEME_EVENT, 'system');
          },
        },
        {
          id: 'appearance.light',
          title: '外观：浅色模式',
          category: '外观' as const,
          type: 'action' as const,
          source: 'builtin' as const,
          aliases: ['theme', 'light', '主题', '浅色', '亮色'],
          icon: 'sun',
          checked: currentThemeMode === 'light',
          run: async (ctx) => {
            await ctx.emitEvent(THEME_EVENT, 'light');
          },
        },
        {
          id: 'appearance.dark',
          title: '外观：深色模式',
          category: '外观' as const,
          type: 'action' as const,
          source: 'builtin' as const,
          aliases: ['theme', 'dark', '主题', '深色', '暗色'],
          icon: 'moon',
          checked: currentThemeMode === 'dark',
          run: async (ctx) => {
            await ctx.emitEvent(THEME_EVENT, 'dark');
          },
        },
      ];
    },
  };
}
