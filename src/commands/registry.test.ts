import { describe, it, expect, vi } from 'vitest';
import { CommandRegistry } from './registry';
import { builtinRouteProvider } from './providers/builtinRouteProvider';
import { folderCopyProvider } from './providers/folderCopyProvider';
import { createAppearanceProvider } from './providers/appearanceProvider';
import { settingsProvider } from './providers/settingsProvider';
import type { CommandItem, CommandProvider, CommandExecutionContext } from './types';

// ─── Mock Tauri API（命令本身不使用，Provider 定义层无依赖） ───
vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(),
  listen: vi.fn(),
}));

// ─── 辅助：构造测试用执行上下文 ───
function makeCtx(): CommandExecutionContext {
  return {
    navigate: vi.fn().mockResolvedValue(undefined),
    activateMainWindow: vi.fn().mockResolvedValue(undefined),
    emitEvent: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── CommandRegistry 核心行为 ───
describe('CommandRegistry', () => {
  it('空注册表返回空列表', async () => {
    const registry = new CommandRegistry();
    expect(await registry.getCommands()).toEqual([]);
  });

  it('注册多个 Provider 后聚合所有命令', async () => {
    const registry = new CommandRegistry()
      .register(builtinRouteProvider)
      .register(folderCopyProvider)
      .register(settingsProvider);

    const commands = await registry.getCommands();
    expect(commands.length).toBeGreaterThanOrEqual(5);
  });

  it('命令按分类顺序排列（页面 → 操作 → 外观 → 设置）', async () => {
    const registry = new CommandRegistry()
      .register(builtinRouteProvider)
      .register(folderCopyProvider)
      .register(createAppearanceProvider('system'))
      .register(settingsProvider);

    const commands = await registry.getCommands();
    const categories = commands.map((c) => c.category);

    // 页面类必须在操作类之前
    const firstPage = categories.indexOf('页面');
    const firstAction = categories.indexOf('操作');
    const firstAppearance = categories.indexOf('外观');
    const firstSettings = categories.indexOf('设置');

    expect(firstPage).toBeLessThan(firstAction);
    expect(firstAction).toBeLessThan(firstAppearance);
    expect(firstAppearance).toBeLessThan(firstSettings);
  });

  it('重复注册同一 id 的 Provider 不会导致命令重复', async () => {
    const registry = new CommandRegistry()
      .register(builtinRouteProvider)
      .register(builtinRouteProvider); // 第二次注册同 id，应被忽略

    const commands = await registry.getCommands();
    const ids = commands.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('后注册的 Provider 中同 id 命令覆盖先注册的', async () => {
    const original: CommandProvider = {
      id: 'test.override',
      getCommands: () => [
        { id: 'cmd.x', title: '原始', category: '操作', type: 'action', source: 'builtin', run: () => {} },
      ],
    };
    const override: CommandProvider = {
      id: 'test.override2',
      getCommands: () => [
        { id: 'cmd.x', title: '覆盖', category: '操作', type: 'action', source: 'builtin', run: () => {} },
      ],
    };

    const registry = new CommandRegistry().register(original).register(override);
    const commands = await registry.getCommands();
    const cmd = commands.find((c) => c.id === 'cmd.x');
    expect(cmd?.title).toBe('覆盖');
  });

  it('注销 Provider 后其命令不再出现在列表中', async () => {
    const registry = new CommandRegistry()
      .register(builtinRouteProvider)
      .register(settingsProvider);

    registry.unregister('builtin.settings');

    const commands = await registry.getCommands();
    const hasSettings = commands.some((c) => c.category === '设置');
    expect(hasSettings).toBe(false);
  });

  it('支持注入虚拟自定义 Provider（UserCustomCommandProvider 兼容性）', async () => {
    const userProvider: CommandProvider = {
      id: 'user.custom',
      getCommands: async () => [
        {
          id: 'user.my-command',
          title: '我的自定义命令',
          category: '自定义',
          type: 'custom',
          source: 'user',
          aliases: ['my'],
          customPayload: { scriptPath: '/scripts/hello.sh' },
          run: () => {},
        },
      ],
    };

    const registry = new CommandRegistry()
      .register(builtinRouteProvider)
      .register(userProvider);

    const commands = await registry.getCommands();
    const userCmd = commands.find((c) => c.id === 'user.my-command');
    expect(userCmd).toBeDefined();
    expect(userCmd?.source).toBe('user');
    expect(userCmd?.customPayload?.scriptPath).toBe('/scripts/hello.sh');
  });
});

// ─── BuiltinRouteProvider ───
describe('builtinRouteProvider', () => {
  it('输出页面分类命令', () => {
    const commands = builtinRouteProvider.getCommands() as CommandItem[];
    expect(commands.every((c) => c.category === '页面')).toBe(true);
  });

  it('包含 folder-copy 和 prompts 路由命令', () => {
    const commands = builtinRouteProvider.getCommands() as CommandItem[];
    const ids = commands.map((c) => c.id);
    expect(ids).toContain('route./folder-copy');
    expect(ids).toContain('route./prompts');
  });

  it('执行跳转命令时调用 activateMainWindow 和 navigate', async () => {
    const commands = builtinRouteProvider.getCommands() as CommandItem[];
    const folderCopyCmd = commands.find((c) => c.id === 'route./folder-copy')!;
    const ctx = makeCtx();
    await folderCopyCmd.run(ctx);
    expect(ctx.activateMainWindow).toHaveBeenCalled();
    expect(ctx.navigate).toHaveBeenCalledWith('/folder-copy');
  });
});

// ─── AppearanceProvider ───
describe('createAppearanceProvider', () => {
  it('当前 themeMode 对应命令的 checked 为 true，其余为 false', () => {
    const provider = createAppearanceProvider('dark');
    const commands = provider.getCommands() as CommandItem[];
    const dark = commands.find((c) => c.id === 'appearance.dark')!;
    const light = commands.find((c) => c.id === 'appearance.light')!;
    const system = commands.find((c) => c.id === 'appearance.system')!;
    expect(dark.checked).toBe(true);
    expect(light.checked).toBe(false);
    expect(system.checked).toBe(false);
  });

  it('执行主题命令时调用 emitEvent', async () => {
    const provider = createAppearanceProvider('system');
    const commands = provider.getCommands() as CommandItem[];
    const lightCmd = commands.find((c) => c.id === 'appearance.light')!;
    const ctx = makeCtx();
    await lightCmd.run(ctx);
    expect(ctx.emitEvent).toHaveBeenCalledWith('kbc://theme-changed', 'light');
  });
});

// ─── SettingsProvider ───
describe('settingsProvider', () => {
  it('输出两条设置分类命令', () => {
    const commands = settingsProvider.getCommands() as CommandItem[];
    expect(commands).toHaveLength(2);
    expect(commands.every((c) => c.category === '设置')).toBe(true);
  });

  it('执行系统设置命令时调用 activateMainWindow 和 emitEvent', async () => {
    const commands = settingsProvider.getCommands() as CommandItem[];
    const systemSettings = commands.find((c) => c.id === 'settings.system')!;
    const ctx = makeCtx();
    await systemSettings.run(ctx);
    expect(ctx.activateMainWindow).toHaveBeenCalled();
    expect(ctx.emitEvent).toHaveBeenCalledWith('kbc://open-system-settings');
  });
});
