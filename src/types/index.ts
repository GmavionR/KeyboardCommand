export interface FileNode {
  id: string;
  name: string;
  path: string; // relative to root
  type: 'file' | 'directory';
  extension?: string;
  size?: number; // bytes
  isIgnored?: boolean;
  ignoredReason?: string;
  isExcluded?: boolean;
  excludedReason?: string;
  children?: FileNode[];
  childrenCount?: number;
  hasMoreChildren?: boolean;
  isExpanded?: boolean;
}

export interface SelectableFile {
  path: string;
  size: number;
}

export interface SelectableFilesResult {
  files: SelectableFile[];
  directoryCounts: { path: string; count: number }[];
}

export interface SearchResultItem {
  id: string;
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  isSelected?: boolean;
}

export interface CopyHistoryItem {
  id: string;
  createdAt: string; // ISO or formatted
  timestamp: number;
  sourceFolder: string;
  fileCount: number;
  filePaths: string[];
  packageSnapshot: string;
}

export interface SettingsConfig {
  whitelist: string[]; // extensions and special names like Dockerfile
  exclusions: string[]; // glob patterns like *.lock, .DS_Store
  ignoredDirectories: string[]; // folder names like node_modules, .git
  largeDirThreshold: number; // default 50
}

export interface CopyFailureDetail {
  filePath: string;
  reason: string;
  code: 'EACCES' | 'EBUSY' | 'ENOENT' | 'ENOPERM' | 'EINVAL' | 'EENCODING';
  detail: string;
}

export interface ContextPackageError {
  failures: CopyFailureDetail[];
}

// refresh_context_package 返回：markdown 为 null 表示全部文件读取失败
export interface RefreshedPackage {
  markdown: string | null;
  paths: string[];
  failures: CopyFailureDetail[];
}
