/**
 * Color conversion and interpolation utilities
 */

const HEX_RE = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

export function hexToRgb(hex) {
    const result = HEX_RE.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
}

export function hexToLottieColor(hex) {
    if (!hex || hex === 'transparent') return [0, 0, 0, 1];
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, 1];
}

export function interpolateColor(from, to, t) {
    const f = hexToRgb(from);
    const toRgb = hexToRgb(to);
    if (!f || !toRgb) return from;

    const r = Math.round(f.r + (toRgb.r - f.r) * t);
    const g = Math.round(f.g + (toRgb.g - f.g) * t);
    const b = Math.round(f.b + (toRgb.b - f.b) * t);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
