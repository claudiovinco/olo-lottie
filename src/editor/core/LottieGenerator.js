/**
 * LottieGenerator - Converts editor state to Lottie JSON
 * Optimized: uses shared easing/color utils, deduplicated frame merging
 */

import { getEasingBezier } from '../utils/easing';
import { hexToLottieColor } from '../utils/color';

export class LottieGenerator {
    constructor(keyframeManager) {
        this.km = keyframeManager;
    }

    generate(layers, canvasWidth, canvasHeight) {
        const lottie = {
            v: '5.7.4',
            fr: this.km.fps,
            ip: 0,
            op: this.km.totalFrames,
            w: canvasWidth,
            h: canvasHeight,
            nm: 'Olo Lottie Animation',
            ddd: 0,
            assets: [],
            layers: [],
        };

        const indMap = new Map();
        for (let i = layers.length - 1; i >= 0; i--) {
            indMap.set(layers[i].id, i);
        }

        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            const lottieLayer = this.convertLayer(layer, i, indMap);
            if (lottieLayer) lottie.layers.push(lottieLayer);
        }

        return lottie;
    }

    convertLayer(layer, index, indMap) {
        const id = layer.id;
        const obj = layer.fabricObject;
        if (!obj) return null;

        const anchorX = layer.anchorX || 0;
        const anchorY = layer.anchorY || 0;

        const baseLayer = {
            ddd: 0, ind: index, ty: 4,
            nm: layer.name || `Layer ${index}`,
            sr: 1,
            ks: this.buildTransform(id, obj, anchorX, anchorY),
            ao: 0, shapes: [],
            ip: 0, op: this.km.totalFrames,
            st: 0, bm: 0,
        };

        if (layer.parentId && indMap.has(layer.parentId)) {
            baseLayer.parent = indMap.get(layer.parentId);
        }

        const shape = this.convertShape(id, obj);
        if (shape) baseLayer.shapes.push(shape);

        return baseLayer;
    }

    buildTransform(layerId, obj, anchorX = 0, anchorY = 0) {
        // Lottie anchor must be in unscaled local coords
        const sx = obj.scaleX || 1;
        const sy = obj.scaleY || 1;
        const localAnchorX = anchorX / sx;
        const localAnchorY = anchorY / sy;

        return {
            o: this.buildAnimatedValue(layerId, 'opacity', (obj.opacity ?? 1) * 100, 100),
            r: this.buildAnimatedValue(layerId, 'angle', obj.angle || 0),
            p: this.buildAnimatedMultiComponent(layerId,
                [{ prop: 'left', static: obj.left || 0, offset: anchorX },
                 { prop: 'top', static: obj.top || 0, offset: anchorY }],
                [0]
            ),
            a: { a: 0, k: [localAnchorX, localAnchorY, 0] },
            s: this.buildAnimatedMultiComponent(layerId,
                [{ prop: 'scaleX', static: obj.scaleX || 1, scale: 100 },
                 { prop: 'scaleY', static: obj.scaleY || 1, scale: 100 }],
                [100]
            ),
        };
    }

    buildAnimatedValue(layerId, property, staticValue, scale = 1) {
        const keyframes = this.km.getKeyframes(layerId, property);

        if (keyframes.length <= 1) {
            const val = keyframes.length === 1 ? keyframes[0].value * scale : staticValue;
            return { a: 0, k: val };
        }

        const kfArray = [];
        for (let i = 0; i < keyframes.length; i++) {
            const kf = keyframes[i];
            const bezier = getEasingBezier(kf.easing);

            if (i === keyframes.length - 1) {
                kfArray.push({ t: kf.frame, s: [kf.value * scale] });
            } else {
                kfArray.push({
                    i: bezier.i, o: bezier.o,
                    t: kf.frame,
                    s: [kf.value * scale],
                    e: [keyframes[i + 1].value * scale],
                });
            }
        }

        return { a: 1, k: kfArray };
    }

    /**
     * Unified multi-component animated value builder
     * Handles position (left+top), scale (scaleX+scaleY), etc.
     */
    buildAnimatedMultiComponent(layerId, components, trailing = []) {
        const allKfs = components.map(c => this.km.getKeyframes(layerId, c.prop));
        const hasAnimation = allKfs.some(kfs => kfs.length > 1);

        if (!hasAnimation) {
            const values = components.map(c => {
                const kfs = this.km.getKeyframes(layerId, c.prop);
                const raw = kfs.length === 1 ? kfs[0].value : c.static;
                return (raw + (c.offset || 0)) * (c.scale || 1);
            });
            return { a: 0, k: [...values, ...trailing] };
        }

        // Merge all unique frames
        const allFrames = new Set();
        allKfs.forEach(kfs => kfs.forEach(kf => allFrames.add(kf.frame)));
        const frames = [...allFrames].sort((a, b) => a - b);

        if (frames.length <= 1) {
            const values = components.map(c => {
                const raw = this.km.getValueAtFrame(layerId, c.prop, frames[0] || 0) ?? c.static;
                return (raw + (c.offset || 0)) * (c.scale || 1);
            });
            return { a: 0, k: [...values, ...trailing] };
        }

        const kfArray = [];
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const values = components.map(c => {
                const raw = this.km.getValueAtFrame(layerId, c.prop, frame) ?? c.static;
                return (raw + (c.offset || 0)) * (c.scale || 1);
            });

            if (i === frames.length - 1) {
                kfArray.push({ t: frame, s: [...values, ...trailing] });
            } else {
                const nextFrame = frames[i + 1];
                const nextValues = components.map(c => {
                    const raw = this.km.getValueAtFrame(layerId, c.prop, nextFrame) ?? c.static;
                    return (raw + (c.offset || 0)) * (c.scale || 1);
                });
                kfArray.push({
                    i: { x: 0.667, y: 1 }, o: { x: 0.333, y: 0 },
                    t: frame,
                    s: [...values, ...trailing],
                    e: [...nextValues, ...trailing],
                });
            }
        }

        return { a: 1, k: kfArray };
    }

    convertShape(layerId, obj) {
        const type = obj.type;
        const group = {
            ty: 'gr', it: [], nm: 'Shape Group',
            np: 3, cix: 2, bm: 0, ix: 1, mn: 'ADBE Vector Group',
        };

        if (type === 'rect') {
            group.it.push(this.makeRect(obj));
        } else if (type === 'circle' || type === 'ellipse') {
            group.it.push(this.makeEllipse(obj));
        } else if (type === 'path') {
            group.it.push(this.makePath(obj));
        } else if (type === 'polygon' && obj.points) {
            group.it.push(this.makePolygonPath(obj));
        } else {
            if (obj.path) group.it.push(this.makePath(obj));
            else if (obj.points) group.it.push(this.makePolygonPath(obj));
            else group.it.push(this.makeRect(obj));
        }

        if (obj.fill && obj.fill !== 'transparent' && obj.fill !== '') {
            group.it.push(this.makeFill(layerId, obj));
        }
        if (obj.stroke && obj.stroke !== 'transparent' && obj.stroke !== '') {
            group.it.push(this.makeStroke(obj));
        }

        group.it.push({
            ty: 'tr',
            p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 },
            o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 },
        });

        return group;
    }

    makeRect(obj) {
        const w = obj.width || 0;
        const h = obj.height || 0;
        return { ty: 'rc', d: 1, s: { a: 0, k: [w, h] }, p: { a: 0, k: [w / 2, h / 2] }, r: { a: 0, k: obj.rx || 0 }, nm: 'Rectangle' };
    }

    makeEllipse(obj) {
        const rx = obj.rx || obj.radius || obj.width / 2;
        const ry = obj.ry || obj.radius || obj.height / 2;
        return { ty: 'el', d: 1, s: { a: 0, k: [rx * 2, ry * 2] }, p: { a: 0, k: [rx, ry] }, nm: 'Ellipse' };
    }

    makePath(obj) {
        const points = [];
        if (obj.path) {
            for (const cmd of obj.path) {
                if (cmd[0] === 'M' || cmd[0] === 'L') points.push([cmd[1], cmd[2]]);
                else if (cmd[0] === 'C') points.push([cmd[5], cmd[6]]);
            }
        }
        return {
            ty: 'sh', d: 1, ks: { a: 0, k: {
                i: points.map(() => [0, 0]),
                o: points.map(() => [0, 0]),
                v: points.map(p => p), c: true,
            }}, nm: 'Path',
        };
    }

    makePolygonPath(obj) {
        const pts = obj.points || [];
        const minX = pts.length ? Math.min(...pts.map(p => p.x)) : 0;
        const minY = pts.length ? Math.min(...pts.map(p => p.y)) : 0;
        const vertices = pts.map(p => [p.x - minX, p.y - minY]);
        return {
            ty: 'sh', d: 1, ks: { a: 0, k: {
                i: pts.map(() => [0, 0]),
                o: pts.map(() => [0, 0]),
                v: vertices, c: true,
            }}, nm: 'Polygon Path',
        };
    }

    makeFill(layerId, obj) {
        const color = hexToLottieColor(obj.fill);
        const fillKf = this.km.getKeyframes(layerId, 'fill');

        let colorProp;
        if (fillKf.length > 1) {
            const kfArray = [];
            for (let i = 0; i < fillKf.length; i++) {
                const c = hexToLottieColor(fillKf[i].value);
                if (i === fillKf.length - 1) {
                    kfArray.push({ t: fillKf[i].frame, s: c });
                } else {
                    const nextC = hexToLottieColor(fillKf[i + 1].value);
                    const bezier = getEasingBezier(fillKf[i].easing);
                    kfArray.push({ t: fillKf[i].frame, s: c, e: nextC, i: bezier.i, o: bezier.o });
                }
            }
            colorProp = { a: 1, k: kfArray };
        } else {
            colorProp = { a: 0, k: color };
        }

        return { ty: 'fl', c: colorProp, o: { a: 0, k: 100 }, r: 1, bm: 0, nm: 'Fill' };
    }

    makeStroke(obj) {
        return {
            ty: 'st', c: { a: 0, k: hexToLottieColor(obj.stroke) },
            o: { a: 0, k: 100 }, w: { a: 0, k: obj.strokeWidth || 1 },
            lc: 2, lj: 2, bm: 0, nm: 'Stroke',
        };
    }
}
