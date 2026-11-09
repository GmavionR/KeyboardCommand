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
  content?: string; // mock file content
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
  code: 'EACCES' | 'EBUSY' | 'ENOENT' | 'ENOPERM';
}

export interface ReReadResult {
  successPaths: string[];
  failedPaths: { path: string; reason: string }[];
}
