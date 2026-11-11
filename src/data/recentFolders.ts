import { normalizeFolderPath } from '../utils/treeUtils';
import { getDatabase } from './settingsDatabase';

export const RECENT_FOLDER_LIMIT = 10;

interface RecentFolderRow {
  path: string;
}

export async function loadRecentFolders(): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.select<RecentFolderRow[]>(
    'SELECT path FROM recent_folder ORDER BY last_used_at DESC LIMIT $1',
    [RECENT_FOLDER_LIMIT]
  );
  return rows.map((row) => row.path);
}

export async function touchRecentFolder(path: string): Promise<void> {
  const database = await getDatabase();
  const displayPath = path.trim();
  await database.execute(
    `INSERT INTO recent_folder (path_key, path, last_used_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(path_key) DO UPDATE SET path = excluded.path, last_used_at = excluded.last_used_at`,
    [normalizeFolderPath(displayPath), displayPath, Date.now()]
  );
  await database.execute(
    `DELETE FROM recent_folder
     WHERE path_key NOT IN (
       SELECT path_key FROM recent_folder ORDER BY last_used_at DESC LIMIT $1
     )`,
    [RECENT_FOLDER_LIMIT]
  );
}

export async function forgetRecentFolder(path: string): Promise<void> {
  const database = await getDatabase();
  await database.execute('DELETE FROM recent_folder WHERE path_key = $1', [
    normalizeFolderPath(path.trim()),
  ]);
}
