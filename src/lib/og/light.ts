/**
 * A share card is lit the way its page is: the post's `light` preset, else the
 * site's rest light (La La Land). The presets are read from src/styles/light.css
 * itself, so a palette changed there changes the cards on the next build.
 * Ink and the muted tone follow src/styles/tokens.css.
 */
import lightCss from '../../styles/light.css?raw';
import { parseOklch, mix, hex, rgba, type Oklab } from './color';

export const REST = 'lalaland';

/* tokens.css: --ink, and --ink-muted = color-mix(in oklab, accent 25%, oklch(0.7 0.012 85)) */
const INK = parseOklch('oklch(0.94 0.008 85)');
const MUTED_BASE = parseOklch('oklch(0.7 0.012 85)');

export type CardLight = {
  name: string;
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  /** The lamp at its palette alpha, and the same colour at zero, for the gradient's end. */
  glow: string;
  glowOut: string;
  /** The bg as rgba, for the scrim over a photo. */
  scrim: (alpha: number) => string;
};

type Preset = { bg: Oklab; accent: Oklab; glow: Oklab; alpha: number };

const presets = new Map<string, Preset>();
for (const [, name, body] of lightCss.matchAll(/html\[data-light='([\w-]+)'\]\s*\{([^}]*)\}/g)) {
  const v = (prop: string) => new RegExp(`--${prop}:\\s*([^;]+);`).exec(body)?.[1]?.trim();
  const bg = v('p-bg');
  const accent = v('p-accent');
  const glow = v('p-glow');
  const alpha = v('glow-alpha');
  if (!bg || !accent || !glow || !alpha) continue;
  presets.set(name, { bg: parseOklch(bg), accent: parseOklch(accent), glow: parseOklch(glow), alpha: parseFloat(alpha) / 100 });
}

export function cardLight(name?: string): CardLight {
  const key = name && presets.has(name) ? name : REST;
  const p = presets.get(key);
  if (!p) throw new Error(`share card: no "${key}" preset in light.css`);
  return {
    name: key,
    bg: hex(p.bg),
    ink: hex(INK),
    muted: hex(mix(p.accent, 0.25, MUTED_BASE)),
    accent: hex(p.accent),
    glow: rgba(p.glow, p.alpha),
    glowOut: rgba(p.glow, 0),
    scrim: (alpha) => rgba(p.bg, alpha),
  };
}
