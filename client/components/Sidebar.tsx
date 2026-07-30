import { getAppConfig } from '@/lib/config';
import { listChats } from '@/lib/store';
import { SidebarContent } from './SidebarContent';

export async function Sidebar() {
  const [chats, config] = await Promise.all([listChats(), getAppConfig()]);

  return <SidebarContent chats={chats} teacherName={config?.teacherName ?? ''} dataDir={config?.dataDir ?? ''} />;
}
