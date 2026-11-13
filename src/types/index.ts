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

// 与 src-tauri/src/search.rs 的 SearchOutcome 同形；结果由用户安装的 fd 产生
export interface SearchMatch {
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface SearchOutcome {
  results: SearchMatch[];
  hasMore: boolean;
  incomplete: boolean;
  warning: string | null;
  // 仅 debug 构建下发；release 构建后端不序列化该字段，前端据此隐藏开发面板
  command?: string | null;
}

// 与 src-tauri/src/history_store.rs 的落盘元数据同形；快照正文按需懒加载，不常驻内存
export interface CopyHistoryItem {
  id: string;
  createdAt: number; // Unix 毫秒
  sourceFolder: string;
  fileCount: number;
  filePaths: string[];
  bodyFileName: string;
}

export interface HistoryListResult {
  records: CopyHistoryItem[];
  warning: string | null;
}

export interface SettingsConfig {
  whitelist: string[]; // 名称包含即命中，如 .ts、Dockerfile、.env
  exclusions: string[]; // 名称包含即命中；尾部 / 表示只作用于文件夹
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
