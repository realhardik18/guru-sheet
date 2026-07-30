import { redirect } from 'next/navigation';
import { getAppConfig } from './config';

/** Redirect server-rendered app pages to first-run setup when needed. */
export async function requireConfiguredPage() {
  const config = await getAppConfig();
  if (!config) redirect('/setup');
  return config;
}
