import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';

/**
 * This app runs locally, so the local Next server can ask the operating system
 * for a folder. Browsers deliberately do not expose absolute folder paths.
 */
async function choosePath(purpose: 'library' | 'ncert' | 'ncert-zip'): Promise<string | null> {
  const prompt =
    purpose === 'ncert-zip'
      ? 'Choose an NCERT ZIP file'
      : purpose === 'ncert'
      ? 'Choose the folder containing NCERT ZIP files'
      : 'Choose where to create your Guru Sheet folder';
  try {
    if (process.platform === 'darwin') {
      const { stdout } = await execFileAsync('osascript', [
        '-e', purpose === 'ncert-zip'
          ? `POSIX path of (choose file with prompt "${prompt}" of type {"zip"})`
          : `POSIX path of (choose folder with prompt "${prompt}")`,
      ]);
      return stdout.trim() || null;
    }

    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-Command',
        purpose === 'ncert-zip'
          ? `Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.OpenFileDialog; $dialog.Filter = 'ZIP files (*.zip)|*.zip'; $dialog.Title = '${prompt}'; if ($dialog.ShowDialog() -eq 'OK') { [Console]::Write($dialog.FileName) }`
          : `Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = '${prompt}'; if ($dialog.ShowDialog() -eq 'OK') { [Console]::Write($dialog.SelectedPath) }`,
      ]);
      return stdout.trim() || null;
    }

    const { stdout } = await execFileAsync('zenity', [
      '--file-selection',
      ...(purpose === 'ncert-zip' ? [] : ['--directory']),
      `--title=${prompt}`,
    ]);
    return stdout.trim() || null;
  } catch {
    // Cancelling a native dialog is reported as a non-zero process exit.
    return null;
  }
}

export async function POST(req: Request) {
  let purpose: 'library' | 'ncert' | 'ncert-zip' = 'library';
  try {
    const body: unknown = await req.json();
    if (body && typeof body === 'object') {
      const requestedPurpose = (body as { purpose?: unknown }).purpose;
      if (requestedPurpose === 'ncert' || requestedPurpose === 'ncert-zip') purpose = requestedPurpose;
    }
  } catch {
    // Setup sends no request body and uses the default prompt.
  }
  const path = await choosePath(purpose);
  return Response.json({ path });
}
