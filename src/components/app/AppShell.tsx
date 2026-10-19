'use client';
// Signed-in layout: desktop sidebar (collapsible), mobile top bar + drawer, account menu.
import Image from 'next/image';
import Link from 'next/link';
import { NavItem } from '@/components/ui/NavItem';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { assetPath } from '@/lib/constants';
import { useProfile } from '@/components/profile-provider';
import { useWallet } from '@/components/wallet-provider';
import { useSignOut } from '@/lib/use-sign-out';
import { useCertificateUnlocked } from '@/lib/cohort-progress';
import { createFlagStore, usePersistentValue } from '@/lib/persistent-store';

/** The desktop sidebar stays collapsed or expanded across pages and visits. */
const sidebarCollapsedStore = createFlagStore('siherdefi_sidebar_collapsed');

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const GearPath = 'M9.165 1.5H8.835C8.43718 1.5 8.05565 1.65804 7.77434 1.93934C7.49304 2.22064 7.335 2.60218 7.335 3V3.135C7.33473 3.39804 7.26529 3.65639 7.13366 3.88413C7.00202 4.11186 6.8128 4.30098 6.585 4.4325L6.2625 4.62C6.03447 4.75165 5.77581 4.82096 5.5125 4.82096C5.2492 4.82096 4.99053 4.75165 4.7625 4.62L4.65 4.56C4.3058 4.36145 3.89688 4.30758 3.513 4.41023C3.12913 4.51288 2.80166 4.76365 2.6025 5.1075L2.4375 5.3925C2.23895 5.7367 2.18508 6.14562 2.28773 6.5295C2.39038 6.91338 2.64115 7.24084 2.985 7.44L3.0975 7.515C3.32421 7.64588 3.51272 7.83382 3.64429 8.06012C3.77586 8.28643 3.84592 8.54323 3.8475 8.805V9.1875C3.84855 9.45182 3.77974 9.71171 3.64803 9.94088C3.51633 10.17 3.32641 10.3603 3.0975 10.4925L2.985 10.56C2.64115 10.7592 2.39038 11.0866 2.28773 11.4705C2.18508 11.8544 2.23895 12.2633 2.4375 12.6075L2.6025 12.8925C2.80166 13.2363 3.12913 13.4871 3.513 13.5898C3.89688 13.6924 4.3058 13.6386 4.65 13.44L4.7625 13.38C4.99053 13.2483 5.2492 13.179 5.5125 13.179C5.77581 13.179 6.03447 13.2483 6.2625 13.38L6.585 13.5675C6.8128 13.699 7.00202 13.8881 7.13366 14.1159C7.26529 14.3436 7.33473 14.602 7.335 14.865V15C7.335 15.3978 7.49304 15.7794 7.77434 16.0607C8.05565 16.342 8.43718 16.5 8.835 16.5H9.165C9.56283 16.5 9.94436 16.342 10.2257 16.0607C10.507 15.7794 10.665 15.3978 10.665 15V14.865C10.6653 14.602 10.7347 14.3436 10.8663 14.1159C10.998 13.8881 11.1872 13.699 11.415 13.5675L11.7375 13.38C11.9655 13.2483 12.2242 13.179 12.4875 13.179C12.7508 13.179 13.0095 13.2483 13.2375 13.38L13.35 13.44C13.6942 13.6386 14.1031 13.6924 14.487 13.5898C14.8709 13.4871 15.1983 13.2363 15.3975 12.8925L15.5625 12.6C15.7611 12.2558 15.8149 11.8469 15.7123 11.463C15.6096 11.0791 15.3588 10.7517 15.015 10.5525L14.9025 10.4925C14.6736 10.3603 14.4837 10.17 14.352 9.94088C14.2203 9.71171 14.1515 9.45182 14.1525 9.1875V8.8125C14.1515 8.54818 14.2203 8.28829 14.352 8.05912C14.4837 7.82995 14.6736 7.63966 14.9025 7.5075L15.015 7.44C15.3588 7.24084 15.6096 6.91338 15.7123 6.5295C15.8149 6.14562 15.7611 5.7367 15.5625 5.3925L15.3975 5.1075C15.1983 4.76365 14.8709 4.51288 14.487 4.41023C14.1031 4.30758 13.6942 4.36145 13.35 4.56L13.2375 4.62C13.0095 4.75165 12.7508 4.82096 12.4875 4.82096C12.2242 4.82096 11.9655 4.75165 11.7375 4.62L11.415 4.4325C11.1872 4.30098 10.998 4.11186 10.8663 3.88413C10.7347 3.65639 10.6653 3.39804 10.665 3.135V3C10.665 2.60218 10.507 2.22064 10.2257 1.93934C9.94436 1.65804 9.56283 1.5 9.165 1.5Z';

/** Sidebar calendar icon, drawn on the same 18px grid and stroke as the other sidebar icons. */
const CalendarNavIcon = (
  <svg viewBox="0 0 18 18" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.25" y="3.375" width="13.5" height="12.375" rx="2.25" />
    <path d="M2.25 7.125h13.5M6 1.875v3M12 1.875v3" />
    <path d="M6 10.5h.01M9 10.5h.01M12 10.5h.01M6 13.125h.01M9 13.125h.01" strokeWidth="1.6" />
  </svg>
);

const Icon = {
  dashboard: (<svg viewBox="0 0 18 18" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M9.75 10.1274H8.25C7.6287 10.1274 7.125 10.6311 7.125 11.2524V15.3759C7.125 15.7904 6.78835 16.1274 6.3739 16.1233C4.63003 16.1058 3.661 16 3.01885 15.3578C2.25 14.589 2.25 13.3516 2.25 10.8767V8.99386C2.25 7.73296 2.25 7.10251 2.51693 6.55675C2.78384 6.01099 3.2815 5.62392 4.27681 4.84979L5.77682 3.68312C7.32517 2.47885 8.09933 1.87671 9 1.87671C9.90067 1.87671 10.6748 2.47885 12.2232 3.68312L13.7232 4.84978C14.7185 5.62392 15.2162 6.01099 15.4831 6.55675C15.75 7.10251 15.75 7.73296 15.75 8.99386V10.8767C15.75 13.3516 15.75 14.589 14.9812 15.3578C14.339 16 13.37 16.1058 11.6261 16.1233C11.2117 16.1274 10.875 15.7904 10.875 15.3759V11.2524C10.875 10.6311 10.3713 10.1274 9.75 10.1274Z" /></svg>),
  certificate: (<svg viewBox="0 0 18 18" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"><path d="M8.625 16.5C5.6198 16.5 4.11719 16.5 3.1836 15.4016C2.25 14.3033 2.25 12.5355 2.25 9C2.25 5.46447 2.25 3.6967 3.1836 2.59835C4.11719 1.5 5.6198 1.5 8.625 1.5C11.6302 1.5 13.1328 1.5 14.0664 2.59835C14.8179 3.48249 14.9645 4.80041 14.9931 7.125" /><path d="M6 6H11.25M6 9.75H8.25" /><path d="M14.7069 13.5791C15.3391 13.1189 15.75 12.3731 15.75 11.5312C15.75 10.1333 14.6167 9 13.2188 9H13.0312C11.6333 9 10.5 10.1333 10.5 11.5312C10.5 12.3731 10.9109 13.1189 11.5431 13.5791M14.7069 13.5791C14.2892 13.8831 13.7749 14.0625 13.2188 14.0625H13.0312C12.4751 14.0625 11.9608 13.8831 11.5431 13.5791M14.7069 13.5791L15.144 14.9553C15.3107 15.4802 15.3941 15.7427 15.3713 15.9062C15.3239 16.2463 15.0464 16.4988 14.7189 16.5C14.5616 16.5006 14.3257 16.3768 13.8542 16.1294C13.652 16.0233 13.5509 15.9702 13.4475 15.939C13.2368 15.8755 13.0132 15.8755 12.8025 15.939C12.6991 15.9702 12.598 16.0233 12.3958 16.1294C11.9243 16.3768 11.6884 16.5006 11.5311 16.5C11.2036 16.4988 10.9261 16.2463 10.8787 15.9062C10.8559 15.7427 10.9393 15.4802 11.106 14.9553L11.5431 13.5791" strokeLinecap="butt" strokeLinejoin="miter" /></svg>),
  settings: (cls = 'size-[18px]') => (<svg viewBox="0 0 18 18" aria-hidden="true" className={cls} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d={GearPath} /><path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" /></svg>),
  lock: (<svg viewBox="0 0 20 20" aria-hidden="true" className="ml-auto size-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="9" width="10" height="8" rx="1.5" /><path d="M7 9V6a3 3 0 0 1 6 0v3" /></svg>),
  collapse: (<svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" /><line x1="8" y1="3" x2="8" y2="17" /></svg>),
};

/** New Si Her DeFi wordmark, 18px tall, brand purple #6231A5. */
const Logo = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <span role="img" aria-label="Si Her DeFi" className="block h-[18px] w-[98px] bg-[#6231a5]" style={{ WebkitMask: `url(${assetPath('/v2/logo-wordmark.png')}) center / contain no-repeat`, mask: `url(${assetPath('/v2/logo-wordmark.png')}) center / contain no-repeat` }} />
);

const EASE = 'duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
const fade = (collapsed: boolean) => `transition-opacity ${collapsed ? 'opacity-0 duration-100' : 'opacity-100 duration-200 delay-100'} motion-reduce:transition-none`;

function Fold({ collapsed, children, className = '' }: { collapsed: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`grid transition-[grid-template-rows,opacity,margin] ${EASE} ${collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'} ${className}`} aria-hidden={collapsed}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** Up to two initials from a name ("Tayyab Ali" → "TA"); empty when there's no name. */
function initials(name?: string) {
  return (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

/** The learner's photo, or their initials on brand purple when they haven't added one. */
export function Avatar({ src, name, className }: { src?: string | null; name?: string; className: string }) {
  if (!src) {
    return (
      <div role="img" aria-label={name ?? ''} className={`relative shrink-0 overflow-hidden rounded-full border border-black/10 bg-gradient-to-br from-[#9b4dff] to-[#7c2ae8] text-white ${className}`}>
        {/* drawn as SVG text so the initials scale with whatever size the avatar is given */}
        <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full">
          <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="currentColor" fontSize="15" fontWeight="500">{initials(name)}</text>
        </svg>
      </div>
    );
  }
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border border-black/10 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={name ?? ''} className="absolute inset-0 size-full object-cover" src={src} />
    </div>
  );
}

function Nav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  const certificateUnlocked = useCertificateUnlocked();
  const fadeCls = fade(collapsed);
  return (
    <>
      <NavItem href="/dashboard" icon={Icon.dashboard} label="Dashboard" labelClassName={fadeCls} onNavigate={onNavigate}
        selected={path.startsWith('/dashboard') || path.startsWith('/module') || path.startsWith('/onboard')} />
      <NavItem href="/certificate" icon={Icon.certificate} label="Achievements" labelClassName={fadeCls} onNavigate={onNavigate}
        selected={path.startsWith('/certificate')} locked={!certificateUnlocked} lockIcon={Icon.lock}
        lockedHint="Unlocks once you earn your first badge" />
      <NavItem href="/calendar" icon={CalendarNavIcon} label="Calendar" labelClassName={fadeCls} onNavigate={onNavigate}
        selected={path.startsWith('/calendar')} />
      <NavItem href="/settings" icon={Icon.settings()} label="Settings" labelClassName={fadeCls} onNavigate={onNavigate}
        selected={path.startsWith('/settings')} />
    </>
  );
}

function WalletChip({ wallet }: { wallet: string | null }) {
  const router = useRouter();
  return (
    <div className="rounded-xl border border-[#e4e4ed] bg-[#f9fafc] px-3 py-2.5">
      <div className="flex items-center gap-1.5 leading-none">
        <span className="text-[10.5px] text-[#8688ae]">Powered by</span>
        <span className="size-1.5 rounded-full bg-[#0052ff]" />
        <span className="text-[11px] font-medium tracking-[0.02em] text-[#0052ff]">BASE</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#ececf2] pt-2 text-[11.5px]">
        {wallet ? (
          <>
            <a href={`https://basescan.org/address/${wallet}`} target="_blank" rel="noopener noreferrer" className="tabular-nums font-medium text-[#171730] transition hover:text-[#0052ff]" title="View on BaseScan">{short(wallet)}</a>
            <span className="flex items-center gap-1.5 text-[11px] text-[#16a34a]"><span className="size-1.5 rounded-full bg-[#22c55e]" />Connected</span>
          </>
        ) : (
          <>
            <span className="text-[#8e8ea6]">No wallet connected</span>
            <button type="button" onClick={() => router.push('/wallet')} className="cursor-pointer text-[11px] font-medium text-[#7c2ae8] link-cta">Connect</button>
          </>
        )}
      </div>
    </div>
  );
}

function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const { profile } = useProfile();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className={`flex justify-between gap-2 overflow-hidden whitespace-nowrap ${collapsed ? 'items-center' : 'items-start'}`}>
        <div className="flex min-w-0 items-start gap-2.5 pl-1">
          <button type="button" onClick={() => setOpen((o) => !o)} className="shrink-0 cursor-pointer rounded-full" title={profile?.name ?? 'Account'} aria-label="Open account menu">
            <Avatar src={profile?.photoUrl} name={profile?.name} className="size-8" />
          </button>
          <div className={`min-w-0 ${collapsed ? 'max-h-8' : ''} ${fade(collapsed)}`}>
            <p className="truncate text-[12px] font-medium text-[#171730] leading-tight">{profile?.name || 'My Account'}</p>
            {/* the full title, on as many lines as it needs: the block grows, pushing the wallet chip up */}
            <p className="whitespace-normal break-words text-[10.5px] text-[#8e8ea6] leading-snug mt-0.5">{profile?.role || 'Learner'}</p>
          </div>
        </div>
        <button type="button" tabIndex={collapsed ? -1 : 0} onClick={() => setOpen((o) => !o)} className={`shrink-0 p-1.5 rounded-lg transition cursor-pointer ${fade(collapsed)} ${open ? 'bg-gray-100 text-[#171730]' : 'text-[#8e8ea6] hover:text-[#171730] hover:bg-gray-100'}`} title="Account options" aria-label="Account options" aria-expanded={open}>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="currentColor"><circle cx="5" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="15" cy="10" r="1.5" /></svg>
        </button>
      </div>
      {open && (
        <div className={`absolute bottom-full mb-2 left-0 rounded-2xl border border-[#e4e4ed] bg-white p-2 shadow-2xl z-50 ${collapsed ? 'w-[220px]' : 'right-0 w-full'}`}>
          <div className="flex items-center gap-2.5 p-2 border-b border-[#f0f0f5]">
            <Avatar src={profile?.photoUrl} name={profile?.name} className="size-8" />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-[#171730]">{profile?.name || 'My Account'}</p>
              <p className="break-words text-[10.5px] leading-snug text-[#8e8ea6]">{profile?.role || 'Learner'}</p>
            </div>
          </div>
          <div className="py-1 space-y-0.5">
            <Link className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-[#5f5f7a] hover:bg-[#f9f9fc] hover:text-[#171730] transition" href="/settings#profile">
              <svg viewBox="0 0 24 24" className="size-4 text-[#8e8ea6]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span>Edit profile</span>
            </Link>
            <Link className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-[#5f5f7a] hover:bg-[#f9f9fc] hover:text-[#171730] transition" href="/settings">
              {Icon.settings('size-4 text-[#8e8ea6]')}<span>Settings</span>
            </Link>
          </div>
          <div className="pt-1 border-t border-[#f0f0f5]">
            <button type="button" onClick={signOut} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50 transition cursor-pointer">
              <svg viewBox="0 0 24 24" className="size-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  const { profile } = useProfile();
  const { wallet } = useWallet();
  const signOut = useSignOut();
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" aria-hidden="true" onClick={onClose} />
      <div className="fixed top-0 left-0 bottom-0 z-50 flex w-[290px] max-w-[85vw] flex-col justify-between bg-white p-5 shadow-2xl">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#ececf2]">
            <Link className="flex items-center gap-2.5" href="/dashboard" onClick={onClose}><Logo /></Link>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#8e8ea6] hover:bg-gray-100 hover:text-[#171730] transition cursor-pointer" aria-label="Close menu">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <nav className="mt-6 space-y-1.5"><Nav onNavigate={onClose} /></nav>
        </div>
        <div className="space-y-3 pt-4 border-t border-[#ececf2]">
          <WalletChip wallet={wallet?.address ?? null} />
          <div className="rounded-xl border border-[#ececf2] bg-white p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar src={profile?.photoUrl} name={profile?.name} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-[#171730]">{profile?.name || 'My Account'}</p>
                <p className="line-clamp-2 break-words text-[11px] leading-snug text-[#8e8ea6]" title={profile?.role || 'Learner'}>{profile?.role || 'Learner'}</p>
              </div>
            </div>
            <div className="space-y-1 pt-1 border-t border-[#f0f0f5]">
              <Link onClick={onClose} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition" href="/settings#profile">
                <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5 text-[#8e8ea6]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m13.5 3.5 3 3L6 17H3v-3L13.5 3.5z" /></svg>
                <span>Edit profile</span>
              </Link>
              <Link onClick={onClose} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition" href="/settings">
                {Icon.settings('size-3.5')}<span>Settings</span>
              </Link>
              <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 transition cursor-pointer">
                <svg viewBox="0 0 24 24" className="size-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { wallet } = useWallet();
  const collapsed = usePersistentValue(sidebarCollapsedStore);
  // No animations until the first paint: a page loaded with the sidebar
  // collapsed renders expanded on the server, and shouldn't visibly shrink
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setDrawer(false); }, [pathname]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f8fc] font-sans antialiased text-[#171730]">
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-[#ececf2] bg-white/95 px-4 py-3 backdrop-blur-md md:hidden">
        <Link className="flex items-center gap-2" href="/dashboard"><Logo /></Link>
        <div className="flex items-center gap-2">
          {wallet?.address ? (
            <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-white px-2.5 py-1 text-[11px] shadow-2xs" title={short(wallet.address)}>
              <span className="size-1.5 rounded-full bg-[#0052ff]" /><span className="font-medium text-[#151534]">Base</span>
              <span className="h-2.5 w-px bg-[#e7e7f1]" /><span className="size-1.5 rounded-full bg-[#16a34a]" /><span className="font-medium text-[#15803d]">Active</span>
            </button>
          ) : (
            <Link href="/wallet" className="inline-flex items-center rounded-full border border-[#e4d7fb] bg-[#f6f0ff] px-2.5 py-1 text-[11px] font-medium text-[#7c2ae8]">Connect</Link>
          )}
          <button type="button" onClick={() => setDrawer(true)} className="rounded-lg p-1.5 text-[#5f5f7a] hover:bg-gray-100 hover:text-[#171730] transition cursor-pointer" aria-label="Open mobile menu">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
          </button>
        </div>
      </header>
      {drawer && <MobileDrawer onClose={() => setDrawer(false)} />}

      <aside className={`sticky top-3 my-3 ml-3 h-[calc(100vh-1.5rem)] hidden md:flex flex-col justify-between rounded-2xl border border-[#ececf2] bg-white shadow-[0_1px_3px_rgba(23,23,48,0.04),0_10px_28px_-18px_rgba(23,23,48,0.12)] transition-[width] ${EASE} z-30 shrink-0 ${collapsed ? 'w-[72px]' : 'w-[240px]'} ${animate ? '' : 'transition-none! [&_*]:transition-none!'}`}>
        <div className="px-4 py-6">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <Link href="/dashboard" tabIndex={collapsed ? -1 : 0} className={`block overflow-hidden transition-[width,opacity] ${EASE} ${collapsed ? 'w-0 opacity-0' : 'w-[98px] opacity-100'}`}><Logo /></Link>
            <button type="button" onClick={() => sidebarCollapsedStore.set(!collapsed)} className="rounded-lg p-1.5 text-[#8e8ea6] hover:bg-gray-100 hover:text-[#171730] transition-colors cursor-pointer" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {Icon.collapse}
            </button>
          </div>
          <nav className="mt-8 space-y-1.5"><Nav collapsed={collapsed} /></nav>
        </div>
        <div className="border-t border-[#f0f0f5] px-4 py-4">
          <Fold collapsed={collapsed} className={collapsed ? 'mb-0' : 'mb-4'}><WalletChip wallet={wallet?.address ?? null} /></Fold>
          <AccountMenu collapsed={collapsed} />
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-14 sm:py-8 overflow-y-auto">{children}</main>
    </div>
  );
}
