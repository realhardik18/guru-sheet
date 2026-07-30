import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';

/**
 * This app runs locally, so the local Next server can ask the operating system
 * for a folder. Browsers deliberately do not expose absolute folder paths.
 */
async function chooseFolder(purpose: 'library' | 'ncert'): Promise<string | null> {
  const prompt =
    purpose === 'ncert'
      ? 'Choose the folder containing NCERT ZIP files'
      : 'Choose where to create your Guru Sheet folder';
  try {
    if (process.platform === 'darwin') {
      const { stdout } = await execFileAsync('osascript', [
        '-e', `POSIX path of (choose folder with prompt "${prompt}")`,
      ]);
      return stdout.trim() || null;
    }

    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-Command',
        `Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = '${prompt}'; if ($dialog.ShowDialog() -eq 'OK') { [Console]::Write($dialog.SelectedPath) }`,
      ]);
      return stdout.trim() || null;
    }

    const { stdout } = await execFileAsync('zenity', [
      '--file-selection',
      '--directory',
      `--title=${prompt}`,
    ]);
    return stdout.trim() || null;
  } catch {
    // Cancelling a native dialog is reported as a non-zero process exit.
    return null;
  }
}

export async function POST(req: Request) {
  let purpose: 'library' | 'ncert' = 'library';
  try {
    const body: unknown = await req.json();
    if (body && typeof body === 'object' && (body as { purpose?: unknown }).purpose === 'ncert') {
      purpose = 'ncert';
    }
  } catch {
    // Setup sends no request body and uses the default prompt.
  }
  const path = await chooseFolder(purpose);
  return Response.json({ path });
}
