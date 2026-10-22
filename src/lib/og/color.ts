/**
 * OKLCH for the share cards. Satori and resvg speak sRGB, the site speaks OKLCH,
 * so the card reads the same presets (src/styles/light.css) and converts them
 * here. Mixing happens in Oklab, as the site's color-mix() does.
 */

export type Oklab = { L: number; a: number; b: number };

/** "oklch(0.19 0.07 265)" → Oklab. */
export function parseOklch(css: string): Oklab {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(css);
  if (!m) throw new Error(`not an oklch() colour: ${css}`);
  const [L, C, H] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = (H * Math.PI) / 180;
  return { L, a: C * Math.cos(h), b: C * Math.sin(h) };
}

/** Oklab mix, like color-mix(in oklab, x p%, y). */
export const mix = (x: Oklab, p: number, y: Oklab): Oklab => ({
  L: x.L * p + y.L * (1 - p),
  a: x.a * p + y.a * (1 - p),
  b: x.b * p + y.b * (1 - p),
});

/** Oklab → sRGB bytes (Björn Ottosson's matrices), clamped to gamut. */
export function toRgb({ L, a, b }: Oklab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  }) as [number, number, number];
}

export const hex = (c: Oklab) => '#' + toRgb(c).map((n) => n.toString(16).padStart(2, '0')).join('');
export const rgba = (c: Oklab, alpha: number) => `rgba(${toRgb(c).join(', ')}, ${alpha})`;
