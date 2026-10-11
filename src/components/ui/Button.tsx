'use client';
// Buttons — Figma "Button · Primary" (node 1025:32) and "Button · White" (node 1027:731), each with
// Default, Hover, Pressed, Focus, Disabled and Loading. States are plain CSS (.btn-primary /
// .btn-white in globals.css)
// Sizes: "lg" is the Figma 48px full-width button; "md" is a compact 40px, content-width version
// of the same component for dialog footers and inline cards (same fills, glow and states).
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'white';
type Size = 'lg' | 'md';

const Spinner = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="btn-primary__spinner" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
    <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const cls = (variant: Variant, size: Size, className: string) =>
  ['btn-primary', variant === 'white' && 'btn-white', size === 'md' && 'btn-md', className].filter(Boolean).join(' ');

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  /** Shows the spinner and the loading label; the button stops reacting. */
  loading?: boolean;
  loadingLabel?: ReactNode;
  /** The trailing arrow (Figma "Show icon"). */
  showIcon?: boolean;
  /** "white" for CTAs on dark or image backgrounds. */
  variant?: Variant;
  size?: Size;
};

export function Button({ children, loading = false, loadingLabel, showIcon = true, variant = 'primary', size = 'lg', className = '', onClick, type = 'button', ...rest }: Props) {
  return (
    <button
      {...rest}
      type={type}
      aria-busy={loading || undefined}
      aria-disabled={loading || rest.disabled || undefined}
      onClick={(e) => { if (loading) { e.preventDefault(); return; } onClick?.(e); }}
      className={cls(variant, size, className)}
    >
      {loading ? (
        <><Spinner /><span>{loadingLabel ?? children}</span></>
      ) : (
        <><span>{children}</span>{showIcon && <span aria-hidden="true" className="btn-primary__icon" />}</>
      )}
    </button>
  );
}

/** Same look, for navigation. `external` opens in a new tab; `disabled` renders the Disabled state. */
export function ButtonLink({ href, children, showIcon = true, variant = 'primary', size = 'lg', external = false, disabled = false, className = '', title }: {
  href: string; children: ReactNode; showIcon?: boolean; variant?: Variant; size?: Size; external?: boolean; disabled?: boolean; className?: string; title?: string;
}) {
  // links that open another site point up-right, like the inline Arrow
  const inner = (<><span>{children}</span>{showIcon && <span aria-hidden="true" className={`btn-primary__icon${external ? ' btn-primary__icon--out' : ''}`} />}</>);
  if (disabled) return <span aria-disabled="true" className={`${cls(variant, size, className)} btn-disabled`}>{inner}</span>;
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" title={title} className={cls(variant, size, className)}>{inner}</a>;
  return <Link href={href} title={title} className={cls(variant, size, className)}>{inner}</Link>;
}
