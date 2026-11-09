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
