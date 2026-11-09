import { FileNode, SettingsConfig, CopyHistoryItem } from '../types';

export const DEFAULT_IGNORED_DIRS = [
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'bower_components',
  'target',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  '.vite',
  '.turbo',
  'coverage',
  'playwright-report',
  'test-results',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.venv',
  'venv',
  '.pnpm',
  '.cache',
  '.idea',
  '.vscode',
  '.history',
  '.gradle',
];

export const DEFAULT_WHITELIST = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.css',
  '.html',
  '.sql',
  '.py',
  '.rs',
  '.go',
  '.yaml',
  '.yml',
  'Dockerfile',
  '.env.example',
];

export const DEFAULT_EXCLUSIONS = [
  '*.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '.DS_Store',
  'Thumbs.db',
  '*.min.js',
  '*.map',
];

export const DEFAULT_SETTINGS: SettingsConfig = {
  whitelist: [...DEFAULT_WHITELIST],
  exclusions: [...DEFAULT_EXCLUSIONS],
  ignoredDirectories: [...DEFAULT_IGNORED_DIRS],
  largeDirThreshold: 50,
};

export const RECENT_FOLDERS = [
  'D:\\projects\\keyboard-command-core',
  'C:\\Users\\Developer\\workspace\\kbc-desktop-client',
  'E:\\code\\electron-automation-tool',
];

// Generate 75 icon files for large directory pagination demonstration
const iconFiles: FileNode[] = Array.from({ length: 75 }).map((_, index) => {
  const name = `icon-${String(index + 1).padStart(3, '0')}.svg`;
  return {
    id: `file-icon-${index + 1}`,
    name,
    path: `src/assets/icons/${name}`,
    type: 'file',
    extension: '.svg',
    size: 1024 + (index * 47) % 3500,
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 ${index % 10}v12"/></svg>`,
  };
});

export const INITIAL_FOLDER_TREE: FileNode = {
  id: 'root',
  name: 'keyboard-command-core',
  path: '',
  type: 'directory',
  isExpanded: true,
  children: [
    {
      id: 'dir-git',
      name: '.git',
      path: '.git',
      type: 'directory',
      isIgnored: true,
      ignoredReason: '规则忽略目录 (.git)',
      children: [],
    },
    {
      id: 'dir-vscode',
      name: '.vscode',
      path: '.vscode',
      type: 'directory',
      isIgnored: true,
      ignoredReason: '规则忽略目录 (.vscode)',
      children: [],
    },
    {
      id: 'dir-node-modules',
      name: 'node_modules',
      path: 'node_modules',
      type: 'directory',
      isIgnored: true,
      ignoredReason: '规则忽略目录 (node_modules)',
      children: [],
    },
    {
      id: 'dir-dist',
      name: 'dist',
      path: 'dist',
      type: 'directory',
      isIgnored: true,
      ignoredReason: '构建产物目录 (dist)',
      children: [],
    },
    {
      id: 'dir-docs',
      name: 'docs',
      path: 'docs',
      type: 'directory',
      isExpanded: true,
      children: [
        {
          id: 'file-doc-arch',
          name: 'ARCHITECTURE.md',
          path: 'docs/ARCHITECTURE.md',
          type: 'file',
          extension: '.md',
          size: 4210,
          content: '# KeyboardCommand Architecture\n\n- Core daemon\n- SQLite config store\n- FD search engine\n- IPC transport',
        },
        {
          id: 'file-doc-spec',
          name: 'COPY_PACKAGE_SPEC.md',
          path: 'docs/COPY_PACKAGE_SPEC.md',
          type: 'file',
          extension: '.md',
          size: 3180,
          content: '# 文件上下文包格式规范\n\n以代码块和路径头组织，便于直接喂入 LLM Prompt。',
        },
      ],
    },
    {
      id: 'dir-src',
      name: 'src',
      path: 'src',
      type: 'directory',
      isExpanded: true,
      children: [
        {
          id: 'dir-core',
          name: 'core',
          path: 'src/core',
          type: 'directory',
          isExpanded: true,
          children: [
            {
              id: 'file-scanner',
              name: 'scanner.ts',
              path: 'src/core/scanner.ts',
              type: 'file',
              extension: '.ts',
              size: 5120,
              content: 'export class DirectoryScanner {\n  // Scan directory with whitelist & exclusion\n}',
            },
            {
              id: 'file-copier',
              name: 'copier.ts',
              path: 'src/core/copier.ts',
              type: 'file',
              extension: '.ts',
              size: 3840,
              content: 'export function generateContextPackage(files: string[]): string {\n  // Build markdown context pack\n}',
            },
            {
              id: 'file-storage',
              name: 'sqlite-storage.ts',
              path: 'src/core/sqlite-storage.ts',
              type: 'file',
              extension: '.ts',
              size: 4290,
              content: 'export class SQLiteSettingsStore {\n  // SQLite query and persistence\n}',
            },
            {
              id: 'file-fd-runner',
              name: 'fd-runner.ts',
              path: 'src/core/fd-runner.ts',
              type: 'file',
              extension: '.ts',
              size: 2680,
              content: 'export async function execFdSearch(query: string): Promise<string[]> {\n  // fd-find integration\n}',
            },
          ],
        },
        {
          id: 'dir-components',
          name: 'components',
          path: 'src/components',
          type: 'directory',
          isExpanded: false,
          children: [
            {
              id: 'file-search-bar',
              name: 'SearchBar.tsx',
              path: 'src/components/SearchBar.tsx',
              type: 'file',
              extension: '.tsx',
              size: 6140,
              content: '// Search bar with 500ms debounce and keyboard navigation',
            },
            {
              id: 'file-tree-view',
              name: 'TreeView.tsx',
              path: 'src/components/TreeView.tsx',
              type: 'file',
              extension: '.tsx',
              size: 8420,
              content: '// Tree view with tri-state selection and batch loading',
            },
            {
              id: 'file-history-panel',
              name: 'HistoryPanel.tsx',
              path: 'src/components/HistoryPanel.tsx',
              type: 'file',
              extension: '.tsx',
              size: 5200,
              content: '// History snapshot copy & re-read actions',
            },
          ],
        },
        {
          id: 'dir-assets',
          name: 'assets',
          path: 'src/assets',
          type: 'directory',
          isExpanded: false,
          children: [
            {
              id: 'dir-icons',
              name: 'icons',
              path: 'src/assets/icons',
              type: 'directory',
              isExpanded: false,
              children: iconFiles, // 75 items -> triggers threshold > 50
            },
          ],
        },
        {
          id: 'file-app-tsx',
          name: 'App.tsx',
          path: 'src/App.tsx',
          type: 'file',
          extension: '.tsx',
          size: 7890,
          content: 'export default function App() {\n  return <MainContainer />;\n}',
        },
        {
          id: 'file-index-css',
          name: 'index.css',
          path: 'src/index.css',
          type: 'file',
          extension: '.css',
          size: 1450,
          content: '@import "tailwindcss";\n/* Windows Fluent styling */',
        },
        {
          id: 'file-main-ts',
          name: 'main.ts',
          path: 'src/main.ts',
          type: 'file',
          extension: '.ts',
          size: 2100,
          content: 'import { bootstrapApp } from "./core/bootstrap";\nbootstrapApp();',
        },
      ],
    },
    {
      id: 'dir-tests',
      name: 'tests',
      path: 'tests',
      type: 'directory',
      isExpanded: false,
      children: [
        {
          id: 'file-copier-test',
          name: 'copier.test.ts',
          path: 'tests/copier.test.ts',
          type: 'file',
          extension: '.ts',
          size: 3200,
          content: 'describe("Copier package generation", () => {\n  it("builds correct format", () => {});\n});',
        },
        {
          id: 'file-scanner-test',
          name: 'scanner.test.ts',
          path: 'tests/scanner.test.ts',
          type: 'file',
          extension: '.ts',
          size: 2900,
          content: 'describe("DirectoryScanner", () => {\n  it("skips ignored directories", () => {});\n});',
        },
      ],
    },
    {
      id: 'file-package-json',
      name: 'package.json',
      path: 'package.json',
      type: 'file',
      extension: '.json',
      size: 1840,
      content: '{\n  "name": "keyboard-command-core",\n  "version": "1.0.0"\n}',
    },
    {
      id: 'file-tsconfig-json',
      name: 'tsconfig.json',
      path: 'tsconfig.json',
      type: 'file',
      extension: '.json',
      size: 920,
      content: '{\n  "compilerOptions": {\n    "target": "ES2022"\n  }\n}',
    },
    {
      id: 'file-vite-config',
      name: 'vite.config.ts',
      path: 'vite.config.ts',
      type: 'file',
      extension: '.ts',
      size: 1100,
      content: 'import { defineConfig } from "vite";\nexport default defineConfig({});',
    },
    {
      id: 'file-readme',
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      extension: '.md',
      size: 2450,
      content: '# KeyboardCommand\n\n文件夹上下文复制模块 Windows 客户端。',
    },
    {
      id: 'file-env-example',
      name: '.env.example',
      path: '.env.example',
      type: 'file',
      extension: '.example',
      size: 340,
      content: 'PORT=3000\nDEBUG=true',
    },
  ],
};

export const INITIAL_HISTORY: CopyHistoryItem[] = [
  {
    id: 'hist-1',
    createdAt: '2026-10-30 10:15:22',
    timestamp: Date.now() - 1000 * 60 * 15,
    sourceFolder: 'D:\\projects\\keyboard-command-core',
    fileCount: 3,
    filePaths: [
      'src/core/scanner.ts',
      'src/core/copier.ts',
      'src/core/sqlite-storage.ts',
    ],
    packageSnapshot: `### 文件上下文包 (3 个文件)
生成时间: 2026-10-30 10:15:22
根目录: D:\\projects\\keyboard-command-core

---
#### 文件: src/core/scanner.ts
\`\`\`typescript
export class DirectoryScanner {
  // Scan directory with whitelist & exclusion
}
\`\`\`

---
#### 文件: src/core/copier.ts
\`\`\`typescript
export function generateContextPackage(files: string[]): string {
  // Build markdown context pack
}
\`\`\`

---
#### 文件: src/core/sqlite-storage.ts
\`\`\`typescript
export class SQLiteSettingsStore {
  // SQLite query and persistence
}
\`\`\`
`,
  },
  {
    id: 'hist-2',
    createdAt: '2026-10-30 09:42:08',
    timestamp: Date.now() - 1000 * 60 * 48,
    sourceFolder: 'D:\\projects\\keyboard-command-core',
    fileCount: 2,
    filePaths: ['docs/ARCHITECTURE.md', 'README.md'],
    packageSnapshot: `### 文件上下文包 (2 个文件)
生成时间: 2026-10-30 09:42:08
根目录: D:\\projects\\keyboard-command-core

---
#### 文件: docs/ARCHITECTURE.md
\`\`\`markdown
# KeyboardCommand Architecture
- Core daemon
- SQLite config store
\`\`\`

---
#### 文件: README.md
\`\`\`markdown
# KeyboardCommand
文件夹上下文复制模块 Windows 客户端。
\`\`\`
`,
  },
  {
    id: 'hist-3',
    createdAt: '2026-10-29 18:30:11',
    timestamp: Date.now() - 1000 * 60 * 60 * 16,
    sourceFolder: 'C:\\Users\\Developer\\workspace\\kbc-desktop-client',
    fileCount: 4,
    filePaths: [
      'package.json',
      'src/App.tsx',
      'src/index.css',
      'src/main.ts',
    ],
    packageSnapshot: `### 文件上下文包 (4 个文件)
生成时间: 2026-10-29 18:30:11
根目录: C:\\Users\\Developer\\workspace\\kbc-desktop-client
...
`,
  },
];
