import { listen } from "@tauri-apps/api/event";
import { router } from "../router";
import { OPEN_FOLDER_EVENT } from "./providers/folderCopyProvider";
import {
  OPEN_SYSTEM_SETTINGS_EVENT,
  OPEN_PAGE_SETTINGS_EVENT,
} from "./providers/settingsProvider";

/** 命令面板派发的路由跳转事件 */
export const NAVIGATE_EVENT = "kbc://navigate";

export { OPEN_FOLDER_EVENT, OPEN_SYSTEM_SETTINGS_EVENT, OPEN_PAGE_SETTINGS_EVENT };

// ─────────────────────────────────────────────
// 文件夹选择器跨页调度状态
// ─────────────────────────────────────────────
let openFolderHandler: (() => Promise<void> | void) | null = null;
let pendingOpenFolder = false;

export function registerOpenFolderHandler(handler: () => Promise<void> | void) {
  openFolderHandler = handler;
  if (pendingOpenFolder) {
    pendingOpenFolder = false;
    setTimeout(() => {
      void handler();
    }, 120);
  }
  return () => {
    if (openFolderHandler === handler) {
      openFolderHandler = null;
    }
  };
}

export async function dispatchOpenFolder() {
  const currentPath = router.state.location.pathname;
  if (currentPath !== "/folder-copy") {
    pendingOpenFolder = true;
    await router.navigate({ to: "/folder-copy" });
  } else {
    if (openFolderHandler) {
      void openFolderHandler();
    } else {
      pendingOpenFolder = true;
    }
  }
}

// ─────────────────────────────────────────────
// 页面功能设置跨页调度状态
// ─────────────────────────────────────────────
let openPageSettingsHandler: (() => void) | null = null;
let pendingPageSettings = false;

export function registerOpenPageSettingsHandler(handler: () => void) {
  openPageSettingsHandler = handler;
  if (pendingPageSettings) {
    pendingPageSettings = false;
    setTimeout(() => {
      handler();
    }, 120);
  }
  return () => {
    if (openPageSettingsHandler === handler) {
      openPageSettingsHandler = null;
    }
  };
}

export async function dispatchOpenPageSettings() {
  const currentPath = router.state.location.pathname;
  if (currentPath !== "/folder-copy") {
    pendingPageSettings = true;
    await router.navigate({ to: "/folder-copy" });
  } else {
    if (openPageSettingsHandler) {
      openPageSettingsHandler();
    } else {
      pendingPageSettings = true;
    }
  }
}

// ─────────────────────────────────────────────
// 全局系统设置状态管理（供 RootLayout 与 TitleBar 共享）
// ─────────────────────────────────────────────
let isSystemSettingsOpen = false;
const systemSettingsListeners = new Set<(open: boolean) => void>();

export function getSystemSettingsOpen() {
  return isSystemSettingsOpen;
}

export function subscribeSystemSettings(listener: (open: boolean) => void) {
  systemSettingsListeners.add(listener);
  return () => systemSettingsListeners.delete(listener);
}

export function openSystemSettings() {
  isSystemSettingsOpen = true;
  for (const listener of systemSettingsListeners) {
    listener(true);
  }
}

export function closeSystemSettings() {
  isSystemSettingsOpen = false;
  for (const listener of systemSettingsListeners) {
    listener(false);
  }
}

// ─────────────────────────────────────────────
// 主窗口统一事件调度入口
// ─────────────────────────────────────────────
export async function initMainWindowDispatcher() {
  const unlisteners: Array<() => void> = [];

  unlisteners.push(
    await listen<string>(NAVIGATE_EVENT, ({ payload }) => {
      if (payload === "/folder-copy" || payload === "/prompts") {
        void router.navigate({ to: payload as "/folder-copy" | "/prompts" });
      }
    })
  );

  unlisteners.push(
    await listen(OPEN_FOLDER_EVENT, () => {
      void dispatchOpenFolder();
    })
  );

  unlisteners.push(
    await listen(OPEN_PAGE_SETTINGS_EVENT, () => {
      void dispatchOpenPageSettings();
    })
  );

  unlisteners.push(
    await listen(OPEN_SYSTEM_SETTINGS_EVENT, () => {
      openSystemSettings();
    })
  );

  return () => {
    unlisteners.forEach((fn) => fn());
  };
}
