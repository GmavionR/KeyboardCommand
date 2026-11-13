import { invoke } from '@tauri-apps/api/core';
import { SearchOutcome, SettingsConfig } from '../types';

export function checkFdAvailable(): Promise<boolean> {
  return invoke<boolean>('fd_available');
}

export function searchPaths(
  rootPath: string,
  query: string,
  settings: SettingsConfig
): Promise<SearchOutcome> {
  return invoke<SearchOutcome>('search_paths', { rootPath, query, settings });
}