import { invoke } from '@tauri-apps/api/core';
import { getVersion, getTauriVersion } from '@tauri-apps/api/app';
import { getDatabase, loadAppSetting, saveAppSetting } from './settingsDatabase';
import { isDevBuild } from './browserMenuPolicy';

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

export interface MemoryStats {
  mainProcessBytes: number;
  childProcessesBytes: number;
  totalBytes: number;
  processCount: number;
  timestamp: string;
}

export function loadMemoryStats(): Promise<MemoryStats> {
  return invoke<MemoryStats>('get_memory_stats');
}

export function loadIdleDestroyDelaySeconds(): Promise<number> {
  return configureIdleDestroyDelay();
}

const IDLE_DESTROY_DELAY_SETTING_KEY = 'idle_destroy_delay_seconds';

export async function configureIdleDestroyDelay(): Promise<number> {
  const defaultSeconds = isDevBuild ? 30 : 180;
  const storedValue = await loadAppSetting(
    IDLE_DESTROY_DELAY_SETTING_KEY,
    String(defaultSeconds),
  );
  const parsedSeconds = Number(storedValue);
  const seconds = isDevBuild
    ? 30
    : Number.isInteger(parsedSeconds) && parsedSeconds >= 30 && parsedSeconds <= 3600
      ? parsedSeconds
      : 180;
  return invoke<number>('set_idle_destroy_delay_seconds', { seconds });
}

export async function saveIdleDestroyDelaySeconds(seconds: number): Promise<number> {
  if (isDevBuild) return 30;
  if (!Number.isInteger(seconds) || seconds < 30 || seconds > 3600) {
    throw new Error('空闲销毁时间必须在 30 到 3600 秒之间。');
  }
  await saveAppSetting(IDLE_DESTROY_DELAY_SETTING_KEY, String(seconds));
  return invoke<number>('set_idle_destroy_delay_seconds', { seconds });
}

export function loadLogDir(): Promise<string> {
  return invoke<string>('get_log_dir');
}

export function openLogDir(): Promise<void> {
  return invoke<void>('open_log_dir');
}
