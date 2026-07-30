import { listChats } from '@/lib/store';
import { SidebarContent } from './SidebarContent';

export async function Sidebar() {
  const chats = await listChats();

  return <SidebarContent chats={chats} />;
}
