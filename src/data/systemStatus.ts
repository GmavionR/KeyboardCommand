import { invoke } from '@tauri-apps/api/core';
import { getVersion, getTauriVersion } from '@tauri-apps/api/app';
import { getDatabase } from './settingsDatabase';

// 与 src-tauri/src/history_store.rs 的 StorageStats 同形，全部为真实磁盘统计
export interface StorageStats {
  databasePath: string;
  databaseBytes: number;
  historyPath: string;
  historyBytes: number;
  historyCount: number;
  historyLimit: number;
}

export function loadStorageStats(): Promise<StorageStats> {
  return invoke<StorageStats>('storage_stats');
}

export interface AppVersion {
  app: string;
  tauri: string;
}

export async function loadAppVersion(): Promise<AppVersion> {
  const [app, tauri] = await Promise.all([getVersion(), getTauriVersion()]);
  return { app, tauri };
}

// 真连一次库读回实际日志模式；连不上就抛错，由调用方呈现错误状态，不预设 WAL
export async function loadJournalMode(): Promise<string> {
  const database = await getDatabase();
  const rows = await database.select<{ journal_mode: string }[]>('PRAGMA journal_mode');
  const mode = rows[0]?.journal_mode;
  if (!mode) throw new Error('SQLite 未返回 journal_mode');
  return mode;
}