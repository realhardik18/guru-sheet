import { constants, promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'guru-sheet.config.json');
const DATA_FOLDER_NAME = 'Guru Sheet';

export type AppConfig = {
  version: 1;
  teacherName: string;
  dataDir: string;
};

export class SetupRequiredError extends Error {
  constructor() {
    super('Guru Sheet has not been set up yet.');
    this.name = 'SetupRequiredError';
  }
}

function isAppConfig(value: unknown): value is AppConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<AppConfig>;
  return (
    config.version === 1 &&
    typeof config.teacherName === 'string' &&
    config.teacherName.trim().length > 0 &&
    typeof config.dataDir === 'string' &&
    path.isAbsolute(config.dataDir)
  );
}

export async function getAppConfig(): Promise<AppConfig | null> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
    return isAppConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function requireAppConfig(): Promise<AppConfig> {
  const config = await getAppConfig();
  if (!config) throw new SetupRequiredError();
  return config;
}

export async function configureApp(input: {
  teacherName: string;
  parentDirectory: string;
}): Promise<AppConfig> {
  const teacherName = input.teacherName.trim();
  if (!teacherName) throw new Error('Enter your name to continue.');
  if (teacherName.length > 100) throw new Error('Your name is too long.');

  const parentDirectory = input.parentDirectory.trim();
  if (!path.isAbsolute(parentDirectory)) {
    throw new Error('Enter an absolute folder path.');
  }

  const resolvedParent = path.resolve(parentDirectory);
  let parentStats;
  try {
    parentStats = await fs.stat(resolvedParent);
  } catch {
    throw new Error('That folder does not exist. Choose an existing folder.');
  }
  if (!parentStats.isDirectory()) throw new Error('That path is not a folder.');

  const dataDir = path.join(resolvedParent, DATA_FOLDER_NAME);
  try {
    await fs.mkdir(path.join(dataDir, 'books'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'chats'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'collections'), { recursive: true });
    await fs.access(dataDir, constants.W_OK);
  } catch {
    throw new Error('GuruSheet cannot write to that location.');
  }

  const config: AppConfig = { version: 1, teacherName, dataDir };
  const temporaryPath = `${CONFIG_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
  await fs.rename(temporaryPath, CONFIG_PATH);
  return config;
}

/** Updates the teacher-facing profile details without touching their library. */
export async function updateTeacherName(teacherNameInput: string): Promise<AppConfig> {
  const teacherName = teacherNameInput.trim();
  if (!teacherName) throw new Error('Enter your name to save your profile.');
  if (teacherName.length > 100) throw new Error('Your name is too long.');

  const config = await requireAppConfig();
  const updated: AppConfig = { ...config, teacherName };
  const temporaryPath = `${CONFIG_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf-8');
  await fs.rename(temporaryPath, CONFIG_PATH);
  return updated;
}
