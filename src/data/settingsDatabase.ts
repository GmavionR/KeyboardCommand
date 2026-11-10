import Database from '@tauri-apps/plugin-sql';
import { SettingsConfig } from '../types';
import { DEFAULT_SETTINGS } from './defaultSettings';

export const DATABASE_FILE_NAME = 'settings.db';
const DATABASE_PATH = `sqlite:${DATABASE_FILE_NAME}`;

interface StoredSettingsRow {
  settings_json: string;
}

let databasePromise: Promise<Database> | null = null;

function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_PATH).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function parseSettings(value: unknown): SettingsConfig {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('whitelist' in value) ||
    !('exclusions' in value) ||
    !('ignoredDirectories' in value) ||
    !('largeDirThreshold' in value)
  ) {
    throw new Error('SQLite 中的文件规则设置格式无效');
  }

  const settings = value as SettingsConfig;
  if (
    !Array.isArray(settings.whitelist) ||
    !settings.whitelist.every((entry) => typeof entry === 'string') ||
    !Array.isArray(settings.exclusions) ||
    !settings.exclusions.every((entry) => typeof entry === 'string') ||
    !Array.isArray(settings.ignoredDirectories) ||
    !settings.ignoredDirectories.every((entry) => typeof entry === 'string') ||
    !Number.isSafeInteger(settings.largeDirThreshold) ||
    settings.largeDirThreshold <= 0
  ) {
    throw new Error('SQLite 中的文件规则设置包含无效值');
  }

  return {
    whitelist: [...settings.whitelist],
    exclusions: [...settings.exclusions],
    ignoredDirectories: [...settings.ignoredDirectories],
    largeDirThreshold: settings.largeDirThreshold,
  };
}

export async function loadFolderCopySettings(): Promise<SettingsConfig> {
  const database = await getDatabase();
  const rows = await database.select<StoredSettingsRow[]>(
    'SELECT settings_json FROM folder_copy_settings WHERE id = 1'
  );

  if (rows.length === 0) {
    return {
      whitelist: [...DEFAULT_SETTINGS.whitelist],
      exclusions: [...DEFAULT_SETTINGS.exclusions],
      ignoredDirectories: [...DEFAULT_SETTINGS.ignoredDirectories],
      largeDirThreshold: DEFAULT_SETTINGS.largeDirThreshold,
    };
  }

  return parseSettings(JSON.parse(rows[0].settings_json));
}

export async function saveFolderCopySettings(settings: SettingsConfig): Promise<void> {
  const database = await getDatabase();
  await database.execute(
    `INSERT INTO folder_copy_settings (id, settings_json)
     VALUES (1, $1)
     ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json`,
    [JSON.stringify(parseSettings(settings))]
  );
}
