/**
 * 功能路由元数据 — 单一事实来源
 *
 * 所有功能路由的路径、展示名称、英文别名与所属分类均在此定义。
 * 路由树（router.tsx）、命令注册表（commandRegistry.ts）、
 * 以及 Rust 侧白名单校验（lib.rs validate_route）均由此派生。
 *
 * 新增路由时：
 *   1. 在此文件 APP_ROUTES 中追加一条 RouteMetadata；
 *   2. 在 router.tsx 中注册对应路由组件；
 *   3. 在 src-tauri/src/lib.rs validate_route() 中追加路径白名单。
 */

export interface RouteMetadata {
  /** 前端路由路径，如 "/folder-copy" */
  path: string;
  /** 命令面板展示名称 */
  title: string;
  /** 英文别名与关键词，用于命令面板包含匹配 */
  aliases: string[];
  /** 所属分类 */
  category: '页面' | '操作' | '外观' | '设置';
}

/** 首版应用功能路由清单（有序，决定命令面板内分类排列顺序） */
export const APP_ROUTES: RouteMetadata[] = [
  {
    path: '/folder-copy',
    title: '打开文件夹内容复制',
    aliases: ['folder-copy', 'fc', 'folder', 'copy'],
    category: '页面',
  },
  {
    path: '/prompts',
    title: '打开 Prompts 页面',
    aliases: ['prompts', 'prompt'],
    category: '页面',
  },
];

/** 快速按路径查找路由元数据 */
export function findRouteByPath(path: string): RouteMetadata | undefined {
  return APP_ROUTES.find((r) => r.path === path);
}
