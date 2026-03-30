/**
 * Shape geometry generation utilities
 */

export function pointsToSVGPath(points, closed) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
    }
    if (closed) d += ' Z';
    return d;
}

export function generateStarPoints(cx, cy, outerR, innerR, numPoints) {
    const points = [];
    const step = Math.PI / numPoints;
    for (let i = 0; i < numPoints * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = i * step - Math.PI / 2;
        points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return points;
}

export function generatePolygonPoints(cx, cy, radius, numSides) {
    const points = [];
    for (let i = 0; i < numSides; i++) {
        const angle = (i * 2 * Math.PI) / numSides - Math.PI / 2;
        points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    return points;
}

export function generateArrowPath(x1, y1, x2, y2, headLength) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const hl = headLength || 15;
    const a1x = x2 - hl * Math.cos(angle - Math.PI / 6);
    const a1y = y2 - hl * Math.sin(angle - Math.PI / 6);
    const a2x = x2 - hl * Math.cos(angle + Math.PI / 6);
    const a2y = y2 - hl * Math.sin(angle + Math.PI / 6);
    return `M ${x1} ${y1} L ${x2} ${y2} M ${a1x} ${a1y} L ${x2} ${y2} L ${a2x} ${a2y}`;
}
