const STORAGE_KEY = 'kbc_allow_browser_menu';

// 开发构建默认放行 WebView 右键菜单，便于调试；发布版默认屏蔽。
// 用户在系统设置里显式选择过一次后，以该选择为准。
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
export const isDevBuild = Boolean(import.meta.env?.DEV);

let isAllowed = stored === null ? isDevBuild : stored === '1';

export function isBrowserMenuAllowed(): boolean {
  return isAllowed;
}

export function setBrowserMenuAllowed(allowed: boolean): void {
  isAllowed = allowed;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, allowed ? '1' : '0');
  }
}

export function installBrowserMenuPolicy(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('contextmenu', (event) => {
    if (isAllowed) return;
    // 即使在发布版也保留可编辑控件内的原生粘贴菜单
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("input, textarea, [contenteditable='true']")) return;
    event.preventDefault();
  });
}
