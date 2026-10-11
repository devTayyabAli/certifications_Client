'use client';
// "Sidebar item" from Figma (Post-UX-Fixes, component set 1040:37): Default, Hover, Selected, Focus, Locked.
// Selected uses the Primary button's fill and inner glow; Locked mirrors the Disabled button. Styles: globals.css "Sidebar item".
import Link from 'next/link';
import type { ReactNode } from 'react';

export function NavItem({ href, icon, label, selected = false, locked = false, lockedHint, lockIcon, labelClassName = '', onNavigate }: {
  href: string; icon: ReactNode; label: string; selected?: boolean; locked?: boolean;
  /** tooltip on a locked item: what unlocks it */
  lockedHint?: string; lockIcon?: ReactNode;
  /** lets the collapsing sidebar fade the label */
  labelClassName?: string; onNavigate?: () => void;
}) {
  const inner = <>{icon}<span className={`nav-item__label ${labelClassName}`}>{label}</span>{locked && lockIcon && <span className={`nav-item__lock ${labelClassName}`}>{lockIcon}</span>}</>;
  if (locked) return <span aria-disabled="true" title={lockedHint ?? label} className="nav-item nav-item--locked">{inner}</span>;
  return <Link href={href} onClick={onNavigate} title={label} aria-current={selected ? 'page' : undefined} className={`nav-item${selected ? ' nav-item--selected' : ''}`}>{inner}</Link>;
}
