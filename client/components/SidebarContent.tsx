'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Books, CaretLeft, CaretRight, ClockCounterClockwise, House } from '@phosphor-icons/react';
import { useState } from 'react';
import type { Chat } from '@/lib/types';

type SidebarContentProps = { chats: Chat[] };

const navItems = [
  { href: '/', label: 'Dashboard', Icon: House },
  { href: '/library', label: 'Library', Icon: Books },
];

export function SidebarContent({ chats }: SidebarContentProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={`no-print flex h-full shrink-0 flex-col border-r border-line bg-surface font-[family-name:var(--font-inter)] transition-[width] duration-200 ease-out ${collapsed ? 'w-[4.5rem]' : 'w-72'}`}>
      <div className={`flex border-b border-line ${collapsed ? 'h-28 flex-col items-center justify-center gap-2 px-2' : 'h-[4.75rem] items-center justify-between px-4'}`}>
        <Link href="/" title="GuruSheet" className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Image src="/logo.png" alt="" width={32} height={32} className="shrink-0 rounded-lg shadow-sm" priority />
          {!collapsed && <span className="truncate text-[17px] font-semibold tracking-[-0.03em]">Guru<span className="text-accent">Sheet</span></span>}
        </Link>
        <CollapseButton collapsed={collapsed} onClick={() => setCollapsed((value) => !value)} iconOnly />
      </div>

      <nav className={`space-y-1 py-4 ${collapsed ? 'px-2' : 'px-3'}`} aria-label="Main navigation">
        {navItems.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
          <Link key={href} href={href} title={label} aria-current={active ? 'page' : undefined} className={`flex h-10 items-center rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent ${collapsed ? 'justify-center' : 'gap-2.5 px-3'} ${active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-accent-soft hover:text-accent'}`}>
            <Icon size={19} weight={active ? 'fill' : 'regular'} aria-hidden="true" className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-2 flex items-center gap-2 px-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <ClockCounterClockwise size={16} weight="bold" aria-hidden="true" /> Recent
          </div>
          {chats.length === 0 ? (
            <p className="px-2 py-2 text-xs leading-5 text-muted">Your recent worksheets will appear here.</p>
          ) : (
            <ul className="space-y-1">
              {chats.slice(0, 15).map((chat) => (
                <li key={chat.id}>
                  <Link href={`/chat/${chat.id}`} title={chat.title} aria-current={pathname === `/chat/${chat.id}` ? 'page' : undefined} className={`block truncate rounded-lg px-2.5 py-2 text-[13px] transition-colors ${pathname === `/chat/${chat.id}` ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-accent-soft hover:text-foreground'}`}>
                    {chat.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : <div className="flex-1" />}

    </aside>
  );
}

function CollapseButton({ collapsed, onClick, iconOnly = false }: { collapsed: boolean; onClick: () => void; iconOnly?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className={`flex h-9 items-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:ring-2 focus-visible:ring-accent ${iconOnly || collapsed ? 'w-9 justify-center' : 'w-full gap-2 px-2.5 text-xs font-medium'}`}>
      {collapsed ? <CaretRight size={18} weight="bold" aria-hidden="true" /> : <CaretLeft size={18} weight="bold" aria-hidden="true" />}
      {!iconOnly && !collapsed && <span>Collapse sidebar</span>}
    </button>
  );
}
