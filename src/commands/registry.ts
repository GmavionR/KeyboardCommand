/**
 * CommandRegistry — 命令注册中心
 *
 * 聚合所有已注册 Provider 的命令列表，提供统一查询接口。
 * 面板渲染层只与 CommandRegistry 交互，无需感知具体 Provider。
 */

import type { CommandItem, CommandProvider } from './types';

/** 分类排列优先级（决定命令面板内的分组顺序） */
const CATEGORY_ORDER: Record<string, number> = {
  页面: 0,
  操作: 1,
  外观: 2,
  设置: 3,
  自定义: 4,
};

export class CommandRegistry {
  private providers: CommandProvider[] = [];

  /** 注册一个命令 Provider */
  register(provider: CommandProvider): this {
    // 防止重复注册同一 id 的 Provider
    if (!this.providers.find((p) => p.id === provider.id)) {
      this.providers.push(provider);
    }
    return this;
  }

  /** 注销一个 Provider（用于动态卸载，如用户关闭自定义命令功能） */
  unregister(providerId: string): this {
    this.providers = this.providers.filter((p) => p.id !== providerId);
    return this;
  }

  /**
   * 聚合所有 Provider 的命令，按分类顺序排列。
   * - 同一分类内保持 Provider 注册顺序与命令声明顺序。
   * - id 重复时后注册的 Provider 命令覆盖先注册的（实现 override）。
   */
  async getCommands(): Promise<CommandItem[]> {
    const allArrays = await Promise.all(
      this.providers.map((p) => Promise.resolve(p.getCommands())),
    );

    // 展平并去重（后注册覆盖先注册）
    const seen = new Map<string, CommandItem>();
    for (const items of allArrays) {
      for (const item of items) {
        seen.set(item.id, item);
      }
    }

    const unique = Array.from(seen.values());

    // 按分类稳定排序
    unique.sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.category] ?? 99;
      const orderB = CATEGORY_ORDER[b.category] ?? 99;
      return orderA - orderB;
    });

    return unique;
  }

  /** 同步版本（仅限所有 Provider 均为同步的场景，如测试） */
  getCommandsSync(): CommandItem[] {
    const allItems: CommandItem[] = [];
    const seen = new Map<string, CommandItem>();

    for (const provider of this.providers) {
      const result = provider.getCommands();
      if (result instanceof Promise) {
        throw new Error(
          `Provider "${provider.id}" is async; use getCommands() instead.`,
        );
      }
      for (const item of result) {
        seen.set(item.id, item);
      }
    }

    for (const item of seen.values()) {
      allItems.push(item);
    }

    allItems.sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.category] ?? 99;
      const orderB = CATEGORY_ORDER[b.category] ?? 99;
      return orderA - orderB;
    });

    return allItems;
  }

  /** 返回所有已注册 Provider 的 id 列表（调试用） */
  getProviderIds(): string[] {
    return this.providers.map((p) => p.id);
  }
}
