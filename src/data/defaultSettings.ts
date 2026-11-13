import { SettingsConfig } from '../types';

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

// 名称包含即命中：.ts 覆盖 .tsx，.js 覆盖 .jsx/.json/.jsonc/.json5，.md 覆盖 .mdx
export const DEFAULT_WHITELIST = [
  '.ts',
  '.js',
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

// .lock 一条即覆盖 package-lock.json / pnpm-lock.yaml / yarn.lock / Cargo.lock
export const DEFAULT_EXCLUSIONS = [
  '.lock',
  '.min.js',
  '.map',
  '.tsbuildinfo',
  '.DS_Store',
  'Thumbs.db',
];

export const DEFAULT_SETTINGS: SettingsConfig = {
  whitelist: [...DEFAULT_WHITELIST],
  exclusions: [...DEFAULT_EXCLUSIONS],
  ignoredDirectories: [...DEFAULT_IGNORED_DIRS],
  largeDirThreshold: 50,
};
