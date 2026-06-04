import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportAllData } from './queries';

export type BackupResult = { name: string; uri: string; shared: boolean };

// Writes a full JSON backup of the database to the app's document directory and
// opens the share sheet so it can be saved to Files / iCloud / email / etc.
// Returns the filename and whether the share sheet opened (false = saved locally
// only, e.g. sharing unavailable).
export async function backupToFile(): Promise<BackupResult> {
  const json = await exportAllData();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const name = `fitmitflip-backup-${stamp}.json`;

  const file = new File(Paths.document, name);
  try { file.create({ overwrite: true }); } catch { /* already exists */ }
  file.write(json);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'FitMitFlip backup',
      UTI: 'public.json',
    });
    return { name, uri: file.uri, shared: true };
  }
  return { name, uri: file.uri, shared: false };
}
