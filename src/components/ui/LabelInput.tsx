'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

function Eye({ size = 16, strokeWidth = 2, ...props }: React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff({ size = 16, strokeWidth = 2, ...props }: React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* the lifted label's size, against its resting one */
const S = 0.78;
/* the stroke sits half a stroke inside the box so none of it is clipped by the svg's own edge */
const IN = 0.75;
/* a multi-line field's label rests on its first line: 14px padding + half of 20px line */
const FIRST_LINE = 24;

export function LabelInput({
  field = 'Email',
  label: labelText,
  type,
  multiline = false,
  corner = 14,
  height,
  showcase = false,
  value: controlled,
  onChange,
  name,
  autoComplete = 'off',
  placeholder,
  maxLength,
  required = false,
  invalid = false,
  disabled = false,
  autoFocus = false,
  describedBy,
  adornment,
  id: idProp,
}: {
  field?: 'Email' | 'Password';
  label?: string;
  type?: 'text' | 'email' | 'url';
  multiline?: boolean;
  corner?: number;
  height?: number;
  showcase?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
  adornment?: ReactNode;
  id?: string;
} = {}) {
  const H = height ?? (multiline ? 104 : 52);
  const r = clamp(corner, 0, H / 2);
  const secret = !multiline && field === 'Password' && !type;
  const label = labelText ?? (secret ? 'Password' : 'Email');
  const inputType = type ?? (secret ? 'password' : 'email');
  const auto = `lbi-${useId().replace(/:/g, '')}`;
  const id = idProp ?? auto;

  const [focus, setFocus] = useState(false);
  const [quiet] = useState(() => showcase && typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  const [own, setOwn] = useState('');
  const value = controlled ?? own;
  const setValue = (v: string) => { if (controlled === undefined) setOwn(v); onChange?.(v); };
  const [autofilled, setAutofilled] = useState(false);
  const [show, setShow] = useState(false);
  const [flip, setFlip] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);

  /* the outline is drawn to the field's real width, so the box is measured and redrawn when its container changes size */
  const box = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(280);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setW(Math.max(120, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* the notch is the label's own width, so it is measured */
  const lab = useRef<HTMLLabelElement | null>(null);
  const [lw, setLw] = useState(40);
  useLayoutEffect(() => {
    if (lab.current) setLw(lab.current.offsetWidth);
  }, [label]);

  /* the adornment's width is kept clear of the text */
  const adorn = useRef<HTMLSpanElement | null>(null);
  const [aw, setAw] = useState(0);
  useLayoutEffect(() => {
    setAw(adornment && adorn.current ? adorn.current.offsetWidth + 12 : 0);
  }, [adornment]);

  useEffect(() => {
    setOwn('');
    setShow(false);
  }, [field]);

  const up = focus || value.length > 0 || autofilled;

  const lx = Math.max(14, r + 4);
  const x0 = Math.max(r * 0.6, lx - 5);
  const x1 = lx + lw * S + 5;
  const a = r - IN;
  const R = W - IN;
  const B = H - IN;
  const mid = W / 2;
  const nm = (x0 + x1) / 2;
  const gapL = `M${nm},${IN} L${x0},${IN}`;
  const gapR = `M${nm},${IN} L${x1},${IN}`;
  const right = r > 0
    ? `M${x1},${IN} L${W - r},${IN} A${a},${a} 0 0 1 ${R},${r} L${R},${H - r} A${a},${a} 0 0 1 ${W - r},${B} L${mid},${B}`
    : `M${x1},${IN} L${R},${IN} L${R},${B} L${mid},${B}`;
  const left = r > 0
    ? `M${x0},${IN} L${r},${IN} A${a},${a} 0 0 0 ${IN},${r} L${IN},${H - r} A${a},${a} 0 0 0 ${r},${B} L${mid},${B}`
    : `M${x0},${IN} L${IN},${IN} L${IN},${B} L${mid},${B}`;

  const reveal = () => {
    setShow((s) => !s);
    setFlip((f) => f + 1);
  };

  const rest = multiline ? `${FIRST_LINE}px` : '50%';
  const lift = multiline ? FIRST_LINE : H / 2;
  const padRight = secret ? 48 : Math.max(lx, aw);

  const shared = {
    id,
    name,
    className: 'lbi-field',
    value,
    disabled,
    required,
    maxLength,
    placeholder,
    autoFocus,
    'aria-invalid': invalid,
    'aria-describedby': describedBy,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    spellCheck: false,
  };

  return (
    <div className="lbi" data-up={up} data-focus={focus} data-filled={value.length > 0} data-invalid={invalid} data-disabled={disabled} data-multiline={multiline}>
      <div
        ref={box}
        className="lbi-box"
        style={{ width: '100%', height: H, borderRadius: r, '--lbi-x': `${lx}px`, '--lbi-rest': rest, '--lbi-lift': `${lift}px` } as React.CSSProperties}
      >
        <svg className="lbi-ring" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d={right} />
          <path d={left} />
          <path className="lbi-gap" d={gapL} pathLength={1} />
          <path className="lbi-gap" d={gapR} pathLength={1} />
        </svg>

        <label className="lbi-label" htmlFor={id} ref={lab}>
          {[...label].map((ch, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}>{ch}</span>
          ))}
        </label>

        {multiline ? (
          <textarea
            {...shared}
            onChange={(e) => setValue(e.target.value)}
            style={{ paddingRight: padRight }}
          />
        ) : (
          <input
            {...shared}
            ref={input}
            data-flip={flip % 2}
            type={secret && show ? 'text' : inputType === 'password' && !secret ? 'text' : inputType}
            onChange={(e) => { setValue(e.target.value); if (autofilled) setAutofilled(false); }}
            onAnimationStart={(e) => { if (e.animationName === 'lbi-autofill') setAutofilled(true); }}
            autoComplete={autoComplete}
            autoCapitalize={inputType === 'text' ? undefined : 'none'}
            inputMode={quiet ? 'none' : inputType === 'email' ? 'email' : inputType === 'url' ? 'url' : undefined}
            style={{ paddingRight: padRight }}
          />
        )}

        {adornment && <span ref={adorn} className="lbi-adorn" aria-hidden="true">{adornment}</span>}

        {secret && (
          <button
            className="lbi-eye"
            type="button"
            data-show={show}
            onPointerDown={(e) => e.preventDefault()}
            onClick={reveal}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
            <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
