// The Figma arrow (akar-icons arrow-right, same asset as the buttons) for every inline arrow:
// "left" for back links, "right" for forward links, "up-right" for links that open a new tab.
// Drawn as a CSS mask so it takes the text colour. Replaces the thin ← → ↗ characters.
export function Arrow({ dir = 'right', className = '' }: { dir?: 'left' | 'right' | 'up-right'; className?: string }) {
  return <span aria-hidden="true" className={`inline-arrow ${className}`} data-dir={dir} />;
}
