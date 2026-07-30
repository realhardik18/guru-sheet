'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Books, Check, ClockCounterClockwise, FolderSimple, Gear, House, List, PencilSimple, Trash, UserCircle, WarningCircle, X } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import type { Chat } from '@/lib/types';

type SidebarContentProps = { chats: Chat[]; teacherName: string; dataDir: string };

const navItems = [
  { href: '/', label: 'Dashboard', Icon: House },
  { href: '/library', label: 'Library', Icon: Books },
];

export function SidebarContent({ chats, teacherName, dataDir }: SidebarContentProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const compact = collapsed && !closing;

  function toggleSidebar() {
    if (collapsed) {
      setClosing(false);
      setCollapsed(false);
    } else {
      setClosing(true);
      setCollapsed(true);
      window.setTimeout(() => setClosing(false), 180);
    }
    setHovering(false);
  }

  return (
    <aside className={`no-print flex h-full shrink-0 flex-col overflow-hidden border-r border-line bg-surface font-[family-name:var(--font-inter)] transition-[width] duration-200 ease-out ${collapsed ? 'w-16' : 'w-72'}`}>
      <div onMouseEnter={() => compact && setHovering(true)} onMouseLeave={() => setHovering(false)} className={`flex h-16 shrink-0 border-b border-line transition-opacity duration-150 ${closing ? 'pointer-events-none opacity-0' : ''} ${compact ? 'items-center justify-center px-2' : 'items-center justify-between px-4'}`}>
        <Link href="/" title="GuruSheet" className={`flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent ${compact && hovering ? 'hidden' : ''}`}>
          <Image src="/guru-sheet-icon.png" alt="" width={compact ? 34 : 32} height={compact ? 34 : 32} className="shrink-0" priority />
          {!compact && <span className="truncate text-[17px] font-semibold tracking-[-0.03em]">Guru<span className="text-accent">Sheet</span></span>}
        </Link>
        {(!compact || hovering) && <CollapseButton collapsed={collapsed} onClick={toggleSidebar} />}
      </div>

      <div className={`flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-150 ${closing ? 'pointer-events-none translate-x-2 opacity-0' : ''}`}>
      <nav className={`space-y-1 py-4 ${compact ? 'px-2' : 'px-3'}`} aria-label="Main navigation">
        {navItems.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
          <Link key={href} href={href} title={label} aria-current={active ? 'page' : undefined} className={`flex h-10 items-center rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent ${compact ? 'justify-center' : 'gap-2.5 px-3'} ${active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-accent-soft hover:text-accent'}`}>
            <Icon size={19} weight={active ? 'fill' : 'regular'} aria-hidden="true" className="shrink-0" />
            {!compact && <span>{label}</span>}
          </Link>
          );
        })}
      </nav>

      {!compact ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-2 flex items-center gap-2 px-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <ClockCounterClockwise size={16} weight="bold" aria-hidden="true" /> Recent
          </div>
          {chats.length === 0 ? (
            <p className="px-2 py-2 text-xs leading-5 text-muted">Your recent worksheets will appear here.</p>
          ) : (
            <ul className="space-y-1">
              {chats.slice(0, 15).map((chat) => (
                <li key={chat.id} className={`group flex items-center rounded-lg pr-1 transition-colors ${pathname === `/chat/${chat.id}` ? 'bg-accent-soft' : 'hover:bg-accent-soft'}`}>
                  <Link href={`/chat/${chat.id}`} title={chat.title} aria-current={pathname === `/chat/${chat.id}` ? 'page' : undefined} className={`min-w-0 flex-1 truncate px-2.5 py-2 text-[13px] transition-colors ${pathname === `/chat/${chat.id}` ? 'font-medium text-accent' : 'text-muted hover:text-foreground'}`}>
                    {chat.title}
                  </Link>
                  <ChatActions chat={chat} active={pathname === `/chat/${chat.id}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : <div className="flex-1" />}
      <ProfileSection
        collapsed={compact}
        teacherName={teacherName}
        dataDir={dataDir}
        open={profileOpen}
        onOpen={() => setProfileOpen(true)}
        onClose={() => setProfileOpen(false)}
      />
      </div>

    </aside>
  );
}

function ChatActions({ chat, active }: { chat: Chat; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function rename() {
    const title = window.prompt('Rename worksheet chat', chat.title)?.trim();
    if (!title || title === chat.title) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
      if (!response.ok) throw new Error();
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`Delete “${chat.title}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      if (active) router.replace('/');
      router.refresh();
    } finally { setBusy(false); }
  }

  return <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
    <button type="button" onClick={() => void rename()} disabled={busy} title="Rename chat" aria-label={`Rename ${chat.title}`} className="rounded-md p-1 text-muted hover:bg-surface hover:text-accent disabled:opacity-40"><PencilSimple size={14} weight="bold" /></button>
    <button type="button" onClick={() => void remove()} disabled={busy} title="Delete chat" aria-label={`Delete ${chat.title}`} className="rounded-md p-1 text-muted hover:bg-surface hover:text-[#a14f24] disabled:opacity-40"><Trash size={14} weight="bold" /></button>
  </span>;
}

function ProfileSection({ collapsed, teacherName, dataDir, open, onOpen, onClose }: {
  collapsed: boolean;
  teacherName: string;
  dataDir: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const initials = teacherName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'T';

  return (
    <>
      <div className={`border-t border-line p-3 ${collapsed ? 'px-2' : ''}`}>
        <button type="button" onClick={onOpen} title="Profile & files" className={`flex w-full items-center rounded-xl p-2 text-left transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{initials}</span>
          {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{teacherName}</span><span className="block truncate text-xs text-muted">Profile & files</span></span>}
          {!collapsed && <Gear size={16} className="shrink-0 text-muted" aria-hidden="true" />}
        </button>
      </div>
      {open && <ProfileDialog teacherName={teacherName} dataDir={dataDir} onClose={onClose} />}
    </>
  );
}

function ProfileDialog({ teacherName, dataDir, onClose }: { teacherName: string; dataDir: string; onClose: () => void }) {
  const [name, setName] = useState(teacherName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null); setSaved(false);
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacherName: name }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? 'Could not save your profile.'); return; }
      setSaved(true);
      window.location.reload();
    } catch { setError('Could not save your profile.'); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="profile-title" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><UserCircle size={23} weight="duotone" /></span><h2 id="profile-title" className="mt-3 text-xl font-semibold tracking-[-0.03em]">Profile & files</h2><p className="mt-1 text-sm text-muted">Manage the details used across your worksheets.</p></div><button type="button" onClick={onClose} aria-label="Close profile" className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-accent"><X size={18} /></button></div>
        <form onSubmit={save} className="mt-6 space-y-5"><label className="block"><span className="text-sm font-medium">Your name</span><input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-accent" /></label>
          <div><span className="text-sm font-medium">Your Guru Sheet files</span><div className="mt-1.5 flex items-start gap-2 rounded-lg border border-line bg-background px-3 py-3"><FolderSimple size={18} className="mt-0.5 shrink-0 text-accent" weight="duotone" /><div className="min-w-0"><p className="break-all font-mono text-xs leading-5 text-muted">{dataDir}</p><p className="mt-1 text-xs leading-5 text-muted">Books, worksheets, and chats are kept locally in this folder.</p></div></div></div>
          {error && <p className="flex gap-1.5 rounded-lg bg-[#b06f1a]/10 px-3 py-2 text-sm text-[#925b14]"><WarningCircle size={16} className="mt-0.5 shrink-0" />{error}</p>}
          {saved && <p className="flex items-center gap-1.5 text-sm text-accent"><Check size={16} weight="bold" />Profile saved.</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-accent-soft">Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-[#124637] disabled:opacity-50">{busy ? 'Saving…' : 'Save profile'}</button></div>
        </form>
      </section>
    </div>
  );
}

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={collapsed ? 'Keep sidebar open' : 'Collapse sidebar'} title={collapsed ? 'Keep sidebar open' : 'Collapse sidebar'} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
      <List size={20} weight="bold" aria-hidden="true" />
    </button>
  );
}
