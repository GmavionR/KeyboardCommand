import { describe, it, expect, vi, beforeEach } from 'vitest';
import { folderCopyProvider, OPEN_FOLDER_EVENT } from './providers/folderCopyProvider';
import {
  dispatchOpenFolder,
  registerOpenFolderHandler,
  dispatchOpenPageSettings,
  registerOpenPageSettingsHandler,
  getSystemSettingsOpen,
  openSystemSettings,
  closeSystemSettings,
  subscribeSystemSettings,
} from './dispatcher';
import { router } from '../router';

vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(),
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../router', () => ({
  router: {
    state: {
      location: {
        pathname: '/folder-copy',
      },
    },
    navigate: vi.fn().mockImplementation(async ({ to }: { to: string }) => {
      (router.state.location as { pathname: string }).pathname = to;
    }),
  },
}));

describe('folderCopyProvider 执行契约', () => {
  it('调用打开文件夹命令时，先激活主窗口、切至 /folder-copy 并广播 OPEN_FOLDER_EVENT', async () => {
    const commands = await folderCopyProvider.getCommands();
    expect(commands).toHaveLength(1);
    const openCommand = commands[0];
    expect(openCommand.id).toBe('folder-copy.open-folder');

    const ctx = {
      navigate: vi.fn().mockResolvedValue(undefined),
      activateMainWindow: vi.fn().mockResolvedValue(undefined),
      emitEvent: vi.fn().mockResolvedValue(undefined),
    };

    await openCommand.run(ctx);

    expect(ctx.activateMainWindow).toHaveBeenCalledTimes(1);
    expect(ctx.navigate).toHaveBeenCalledWith('/folder-copy');
    expect(ctx.emitEvent).toHaveBeenCalledWith(OPEN_FOLDER_EVENT);
  });
});

describe('跨页调度器 (dispatcher)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (router.state.location as { pathname: string }).pathname = '/folder-copy';
  });

  it('在 /folder-copy 页面时，dispatchOpenFolder 立即调用已注册的 handler', async () => {
    const handler = vi.fn();
    const unregister = registerOpenFolderHandler(handler);

    await dispatchOpenFolder();

    expect(handler).toHaveBeenCalledTimes(1);
    unregister();
  });

  it('在 /prompts 页面时，dispatchOpenFolder 自动导航到 /folder-copy 并在组件挂载后消费触发', async () => {
    (router.state.location as { pathname: string }).pathname = '/prompts';
    const handler = vi.fn();

    // 此时尚未注册 handler（组件未挂载）
    await dispatchOpenFolder();

    // 应该已发起路由跳转
    expect(router.navigate).toHaveBeenCalledWith({ to: '/folder-copy' });
    expect(handler).not.toHaveBeenCalled();

    // 页面挂载，注册 handler，通过定时微任务消费 pending action
    await new Promise<void>((resolve) => {
      const unregister = registerOpenFolderHandler(() => {
        handler();
        unregister();
        resolve();
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatchOpenPageSettings 在非当前页时先跳转并在挂载后触发设置弹窗', async () => {
    (router.state.location as { pathname: string }).pathname = '/prompts';
    const handler = vi.fn();

    await dispatchOpenPageSettings();
    expect(router.navigate).toHaveBeenCalledWith({ to: '/folder-copy' });

    await new Promise<void>((resolve) => {
      const unregister = registerOpenPageSettingsHandler(() => {
        handler();
        unregister();
        resolve();
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('全局系统设置支持状态订阅与切换', () => {
    let current = getSystemSettingsOpen();
    expect(current).toBe(false);

    const states: boolean[] = [];
    const unsubscribe = subscribeSystemSettings((open) => {
      states.push(open);
    });

    openSystemSettings();
    expect(getSystemSettingsOpen()).toBe(true);

    closeSystemSettings();
    expect(getSystemSettingsOpen()).toBe(false);

    expect(states).toEqual([true, false]);
    unsubscribe();
  });
});
