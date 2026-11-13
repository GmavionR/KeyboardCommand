import { FileNode, SettingsConfig } from '../types';

export function normalizeFolderPath(path: string): string {
  return path.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();
}

export function getAllSelectableFilesInNode(
  node: FileNode,
  settings: SettingsConfig
): string[] {
  if (node.isIgnored || node.isExcluded) return [];
  if (node.type === 'file') {
    if (isFileAllowed(node.name, node.path, settings)) {
      return [node.path];
    }
    return [];
  }
  let files: string[] = [];
  if (node.children) {
    for (const child of node.children) {
      files = files.concat(getAllSelectableFilesInNode(child, settings));
    }
  }
  return files;
}

// 与 Rust 侧 rule_text 一致：规则按「名称包含该文本」判定，大小写不敏感，
// `*` 无特殊含义直接丢弃，尾部 `/` 只表示这是一条目录规则。
function ruleText(rule: string): string {
  return rule.trim().replace(/\/+$/, '').replace(/\*/g, '').trim().toLowerCase();
}

function isDirectoryRule(rule: string): boolean {
  return rule.trim().endsWith('/');
}

function nameMatchesRule(loweredName: string, rule: string): boolean {
  const text = ruleText(rule);
  return text.length > 0 && loweredName.includes(text);
}

export function isFileAllowed(
  filename: string,
  relativePath: string,
  settings: SettingsConfig
): boolean {
  const segments = relativePath.split(/[/\\]/);
  for (const seg of segments.slice(0, -1)) {
    const loweredSeg = seg.toLowerCase();
    if (settings.ignoredDirectories.some((ignored) => ignored.trim().toLowerCase() === loweredSeg)) return false;
    if (settings.exclusions.some((rule) => isDirectoryRule(rule) && nameMatchesRule(loweredSeg, rule))) return false;
  }

  const loweredName = filename.toLowerCase();
  if (settings.exclusions.some((rule) => !isDirectoryRule(rule) && nameMatchesRule(loweredName, rule))) return false;

  return settings.whitelist.some((rule) => nameMatchesRule(loweredName, rule));
}

export function getNodeTriState(
  node: FileNode,
  selectedPaths: Set<string>,
  settings: SettingsConfig,
  selectableCounts: Map<string, number> = new Map(),
): 'checked' | 'unchecked' | 'indeterminate' {
  if (node.type === 'file') {
    return selectedPaths.has(node.path) ? 'checked' : 'unchecked';
  }
  if (node.isIgnored || node.isExcluded) return 'unchecked';

  const isWithinNode = (path: string) =>
    node.path === '' || path.startsWith(`${node.path}/`);
  const selectedCount = [...selectedPaths].filter(isWithinNode).length;
  if (selectedCount === 0) return 'unchecked';

  const knownCount = selectableCounts.get(node.path);
  if (knownCount !== undefined) {
    if (selectedCount === knownCount) return 'checked';
    return 'indeterminate';
  }

  const allFiles = getAllSelectableFilesInNode(node, settings);
  const hasUnloadedEligibleCandidates = (directory: FileNode): boolean => {
    if (directory.type !== 'directory' || directory.isIgnored || directory.isExcluded) return false;
    if (selectableCounts.has(directory.path)) return false;
    if (directory.hasMoreChildren) return true;
    if (directory.children === undefined && directory.path !== '' && !selectableCounts.has(directory.path)) return true;
    return directory.children?.some(hasUnloadedEligibleCandidates) ?? false;
  };
  if (hasUnloadedEligibleCandidates(node)) return 'indeterminate';
  if (selectedCount === allFiles.length) return 'checked';
  return 'indeterminate';
}

export function findNodeByPath(root: FileNode, targetPath: string): FileNode | null {
  if (root.path === targetPath) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const found = findNodeByPath(child, targetPath);
    if (found) return found;
  }
  return null;
}

export function getAncestorPaths(targetPath: string): string[] {
  const parts = targetPath.split(/[/\\]/);
  const ancestors: string[] = [];
  let current = '';
  for (let i = 0; i < parts.length - 1; i++) {
    current = current ? `${current}/${parts[i]}` : parts[i];
    ancestors.push(current);
  }
  return ancestors;
}

export function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
