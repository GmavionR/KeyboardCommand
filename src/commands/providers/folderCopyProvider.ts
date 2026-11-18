/**
 * FolderCopyProvider — 文件夹内容复制核心动作命令
 *
 * 输出「打开文件夹...」动作命令。
 * 跨页面联动的具体调度逻辑（切换至 /folder-copy 后自动弹出系统
 * 文件夹选择对话框）将在 issue 32 中完善；此处通过 emitEvent
 * 派发事件，FolderCopyApp 负责监听并响应。
 */

import type { CommandItem, CommandProvider } from '../types';

/** 跨 Webview 派发给主窗口的"打开文件夹"请求事件名 */
export const OPEN_FOLDER_EVENT = 'kbc://open-folder-dialog';

export const folderCopyProvider: CommandProvider = {
  id: 'feature.folder-copy',

  getCommands(): CommandItem[] {
    return [
      {
        id: 'folder-copy.open-folder',
        title: '打开文件夹...',
        category: '操作' as const,
        type: 'action' as const,
        source: 'feature' as const,
        aliases: ['open', 'folder', 'dir', '文件夹', '打开'],
        icon: 'folder-open',
        run: async (ctx) => {
          // 1. 激活主窗口并带到前台
          await ctx.activateMainWindow();
          // 2. 切换到文件夹复制页面
          await ctx.navigate('/folder-copy');
          // 3. 派发事件触发系统文件夹选择对话框（由 FolderCopyApp 监听响应）
          await ctx.emitEvent(OPEN_FOLDER_EVENT);
        },
      },
    ];
  },
};
