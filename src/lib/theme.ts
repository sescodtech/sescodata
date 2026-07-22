import { useEffect } from 'react';
import { settings } from './api';

const CACHE_KEY = 'shb_primary_color';

function clamp(n: number) {
  return Math.max(0, Math.min(255, n));
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Mix a hex color toward black (negative amt) or white (positive amt), amt in [-1, 1]. */
function shade(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  const target = amt > 0 ? 255 : 0;
  const p = Math.abs(amt);
  return rgbToHex(r + (target - r) * p, g + (target - g) * p, b + (target - b) * p);
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Applies the primary brand color to the three CSS custom properties every
 * shb-gold-* Tailwind class resolves to (see src/index.css). A single admin
 * color-picker value is all that's needed — the darker/lighter shades used
 * for hover states, gradients, and soft backgrounds are derived from it.
 */
export function applyBrandColor(hex: string) {
  if (!HEX_COLOR.test(hex)) return;
  const root = document.documentElement.style;
  root.setProperty('--color-shb-gold', hex);
  root.setProperty('--color-shb-gold-dark', shade(hex, -0.15));
  root.setProperty('--color-shb-gold-soft', shade(hex, 0.85));
  root.setProperty('--shadow-gold', `0 8px 24px ${hex}40`);
  localStorage.setItem(CACHE_KEY, hex);
}

/** Fetches and applies the platform brand color on mount. Applies a cached value instantly (no flash of default color), then reconciles with the server. */
export function useApplyBranding() {
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) applyBrandColor(cached);

    settings.getBranding()
      .then((res) => {
        if (res.primaryColor) applyBrandColor(res.primaryColor);
      })
      .catch(() => {
        // Network hiccup or backend asleep — keep whatever's already applied
        // (cached value or the CSS default) rather than surfacing an error
        // for a purely cosmetic, non-blocking fetch.
      });
  }, []);
}
