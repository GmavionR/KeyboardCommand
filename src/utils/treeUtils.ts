import { FileNode, SettingsConfig, SearchResultItem } from '../types';

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

export function isFileAllowed(
  filename: string,
  relativePath: string,
  settings: SettingsConfig
): boolean {
  // Check ignored dirs in path segments
  const segments = relativePath.split(/[/\\]/);
  for (const seg of segments.slice(0, -1)) {
    if (settings.ignoredDirectories.some((ignored) => ignored.toLowerCase() === seg.toLowerCase())) return false;
    const isExcludedDirectory = settings.exclusions.some((rule) => {
      if (!rule.endsWith('/')) return false;
      const expression = rule
        .slice(0, -1)
        .split('*')
        .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
        .join('.*');
      return new RegExp(`^${expression}$`, 'i').test(seg);
    });
    if (isExcludedDirectory) return false;
  }

  const matchesRule = (rule: string, value: string) => {
    const expression = rule
      .split('*')
      .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
      .join('.*');
    return new RegExp(`^${expression}$`, 'i').test(value);
  };

  // Exclusions are name-based; a trailing slash marks a directory rule.
  for (const rule of settings.exclusions) {
    if (!rule.endsWith('/') && matchesRule(rule, filename)) return false;
  }

  // Check whitelist
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : '';
  const matchExt = settings.whitelist.some((rule) => rule.toLowerCase() === ext);
  const matchExact = settings.whitelist.some((rule) => rule.toLowerCase() === filename.toLowerCase());

  return matchExt || matchExact;
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
  if (node.isIgnored) return 'unchecked';

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

export function searchNodes(
  root: FileNode,
  query: string,
  settings: SettingsConfig,
  selectedPaths: Set<string>
): SearchResultItem[] {
  if (!query.trim()) return [];
  const normalized = query.toLowerCase().trim();
  const results: SearchResultItem[] = [];

  function traverse(node: FileNode) {
    if (node.isIgnored) return;

    if (node.path) {
      const nodePathLower = node.path.toLowerCase();
      const nodeNameLower = node.name.toLowerCase();
      if (nodePathLower.includes(normalized) || nodeNameLower.includes(normalized)) {
        if (node.type === 'file') {
          if (isFileAllowed(node.name, node.path, settings)) {
            results.push({
              id: node.id,
              name: node.name,
              relativePath: node.path,
              type: 'file',
              isSelected: selectedPaths.has(node.path),
            });
          }
        } else if (node.type === 'directory') {
          results.push({
            id: node.id,
            name: node.name,
            relativePath: node.path,
            type: 'directory',
          });
        }
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);

  // Sort ascending by full path
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return results;
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

export function generateContextPackageMarkdown(
  rootFolder: string,
  selectedPaths: string[],
  rootNode: FileNode
): string {
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  let doc = `### 文件上下文包 (${selectedPaths.length} 个文件)\n`;
  doc += `生成时间: ${timeStr}\n`;
  doc += `来源根目录: ${rootFolder}\n\n`;
  doc += `#### 文件清单:\n`;
  selectedPaths.forEach((p, idx) => {
    doc += `${idx + 1}. \`${p}\`\n`;
  });
  doc += `\n========================================\n\n`;

  selectedPaths.forEach((p) => {
    const node = findNodeByPath(rootNode, p);
    const content = node?.content || `// 模拟读取自本地文件: ${p}`;
    const ext = p.split('.').pop() || '';
    const lang = ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'html', 'md', 'py', 'rs'].includes(ext) ? ext : '';

    doc += `#### [FILE: ${p}]\n`;
    doc += `\`\`\`${lang}\n`;
    doc += content + `\n`;
    doc += `\`\`\`\n\n`;
  });

  return doc;
}
