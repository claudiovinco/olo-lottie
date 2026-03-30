/**
 * LottieGenerator - Converts editor state (Fabric.js objects + keyframes) to Lottie JSON
 */

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

        // Build layer id → Lottie index map (needed for parent references)
        const indMap = new Map();
        for (let i = layers.length - 1; i >= 0; i--) {
            indMap.set(layers[i].id, i);
        }

        // Process layers in reverse order (bottom to top in Lottie)
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            const lottieLayer = this.convertLayer(layer, i, indMap);
            if (lottieLayer) {
                lottie.layers.push(lottieLayer);
            }
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
            ddd: 0,
            ind: index,
            ty: 4, // Shape layer
            nm: layer.name || `Layer ${index}`,
            sr: 1,
            ks: this.buildTransform(id, obj, anchorX, anchorY),
            ao: 0,
            shapes: [],
            ip: 0,
            op: this.km.totalFrames,
            st: 0,
            bm: 0,
        };

        // Parent reference for puppet/rigging FK
        if (layer.parentId && indMap.has(layer.parentId)) {
            baseLayer.parent = indMap.get(layer.parentId);
        }

        const shape = this.convertShape(id, obj);
        if (shape) {
            baseLayer.shapes.push(shape);
        }

        return baseLayer;
    }

    buildTransform(layerId, obj, anchorX = 0, anchorY = 0) {
        return {
            o: this.buildAnimatedValue(layerId, 'opacity', (obj.opacity ?? 1) * 100, 100),
            r: this.buildAnimatedValue(layerId, 'angle', obj.angle || 0),
            p: this.buildAnimatedPosition(layerId, obj, anchorX, anchorY),
            a: { a: 0, k: [anchorX, anchorY, 0] },
            s: this.buildAnimatedScale(layerId, obj),
        };
    }

    buildAnimatedValue(layerId, property, staticValue, scale = 1) {
        const keyframes = this.km.getKeyframes(layerId, property);

        if (keyframes.length <= 1) {
            const val = keyframes.length === 1 ? keyframes[0].value * scale : staticValue;
            return { a: 0, k: val };
        }

        // Animated
        const kfArray = [];
        for (let i = 0; i < keyframes.length; i++) {
            const kf = keyframes[i];
            const entry = {
                i: { x: [0.667], y: [1] },
                o: { x: [0.333], y: [0] },
                t: kf.frame,
                s: [kf.value * scale],
            };

            if (kf.easing === 'linear') {
                entry.i = { x: [1], y: [1] };
                entry.o = { x: [0], y: [0] };
            } else if (kf.easing === 'easeIn') {
                entry.i = { x: [1], y: [1] };
                entry.o = { x: [0.42], y: [0] };
            } else if (kf.easing === 'easeOut') {
                entry.i = { x: [0.58], y: [1] };
                entry.o = { x: [0], y: [0] };
            }

            // Last keyframe needs end value only
            if (i === keyframes.length - 1) {
                kfArray.push({ t: kf.frame, s: [kf.value * scale] });
            } else {
                entry.e = [keyframes[i + 1].value * scale];
                kfArray.push(entry);
            }
        }

        return { a: 1, k: kfArray };
    }

    buildAnimatedPosition(layerId, obj, anchorX = 0, anchorY = 0) {
        const posKfX = this.km.getKeyframes(layerId, 'left');
        const posKfY = this.km.getKeyframes(layerId, 'top');

        const staticX = obj.left || 0;
        const staticY = obj.top || 0;

        if (posKfX.length <= 1 && posKfY.length <= 1) {
            const x = (posKfX.length === 1 ? posKfX[0].value : staticX) + anchorX;
            const y = (posKfY.length === 1 ? posKfY[0].value : staticY) + anchorY;
            return { a: 0, k: [x, y, 0] };
        }

        // Combine X and Y keyframes into position keyframes
        const allFrames = new Set();
        posKfX.forEach(kf => allFrames.add(kf.frame));
        posKfY.forEach(kf => allFrames.add(kf.frame));
        const frames = [...allFrames].sort((a, b) => a - b);

        if (frames.length <= 1) {
            return { a: 0, k: [staticX + anchorX, staticY + anchorY, 0] };
        }

        const kfArray = [];
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const x = (this.km.getValueAtFrame(layerId, 'left', frame) ?? staticX) + anchorX;
            const y = (this.km.getValueAtFrame(layerId, 'top', frame) ?? staticY) + anchorY;

            if (i === frames.length - 1) {
                kfArray.push({ t: frame, s: [x, y, 0] });
            } else {
                const nextFrame = frames[i + 1];
                const nextX = (this.km.getValueAtFrame(layerId, 'left', nextFrame) ?? staticX) + anchorX;
                const nextY = (this.km.getValueAtFrame(layerId, 'top', nextFrame) ?? staticY) + anchorY;

                kfArray.push({
                    i: { x: 0.667, y: 1 },
                    o: { x: 0.333, y: 0 },
                    t: frame,
                    s: [x, y, 0],
                    e: [nextX, nextY, 0],
                });
            }
        }

        return { a: 1, k: kfArray };
    }

    buildAnimatedScale(layerId, obj) {
        const scaleXKf = this.km.getKeyframes(layerId, 'scaleX');
        const scaleYKf = this.km.getKeyframes(layerId, 'scaleY');

        const staticSX = (obj.scaleX || 1) * 100;
        const staticSY = (obj.scaleY || 1) * 100;

        if (scaleXKf.length <= 1 && scaleYKf.length <= 1) {
            const sx = scaleXKf.length === 1 ? scaleXKf[0].value * 100 : staticSX;
            const sy = scaleYKf.length === 1 ? scaleYKf[0].value * 100 : staticSY;
            return { a: 0, k: [sx, sy, 100] };
        }

        const allFrames = new Set();
        scaleXKf.forEach(kf => allFrames.add(kf.frame));
        scaleYKf.forEach(kf => allFrames.add(kf.frame));
        const frames = [...allFrames].sort((a, b) => a - b);

        const kfArray = [];
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const sx = (this.km.getValueAtFrame(layerId, 'scaleX', frame) ?? (obj.scaleX || 1)) * 100;
            const sy = (this.km.getValueAtFrame(layerId, 'scaleY', frame) ?? (obj.scaleY || 1)) * 100;

            if (i === frames.length - 1) {
                kfArray.push({ t: frame, s: [sx, sy, 100] });
            } else {
                const nextFrame = frames[i + 1];
                const nextSx = (this.km.getValueAtFrame(layerId, 'scaleX', nextFrame) ?? (obj.scaleX || 1)) * 100;
                const nextSy = (this.km.getValueAtFrame(layerId, 'scaleY', nextFrame) ?? (obj.scaleY || 1)) * 100;

                kfArray.push({
                    i: { x: 0.667, y: 1 },
                    o: { x: 0.333, y: 0 },
                    t: frame,
                    s: [sx, sy, 100],
                    e: [nextSx, nextSy, 100],
                });
            }
        }

        return { a: 1, k: kfArray };
    }

    convertShape(layerId, obj) {
        const type = obj.type;
        const group = {
            ty: 'gr',
            it: [],
            nm: 'Shape Group',
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: 'ADBE Vector Group',
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
            // Fallback: try path, then rect
            if (obj.path) {
                group.it.push(this.makePath(obj));
            } else if (obj.points) {
                group.it.push(this.makePolygonPath(obj));
            } else {
                group.it.push(this.makeRect(obj));
            }
        }

        // Fill
        if (obj.fill && obj.fill !== 'transparent' && obj.fill !== '') {
            group.it.push(this.makeFill(layerId, obj));
        }

        // Stroke
        if (obj.stroke && obj.stroke !== 'transparent' && obj.stroke !== '') {
            group.it.push(this.makeStroke(obj));
        }

        // Transform within group
        group.it.push({
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
            sk: { a: 0, k: 0 },
            sa: { a: 0, k: 0 },
        });

        return group;
    }

    makeRect(obj) {
        const w = obj.width || 0;
        const h = obj.height || 0;
        return {
            ty: 'rc',
            d: 1,
            s: { a: 0, k: [w, h] },
            p: { a: 0, k: [w / 2, h / 2] },
            r: { a: 0, k: obj.rx || 0 },
            nm: 'Rectangle',
        };
    }

    makeEllipse(obj) {
        const rx = obj.rx || obj.radius || obj.width / 2;
        const ry = obj.ry || obj.radius || obj.height / 2;
        return {
            ty: 'el',
            d: 1,
            s: { a: 0, k: [rx * 2, ry * 2] },
            p: { a: 0, k: [rx, ry] },
            nm: 'Ellipse',
        };
    }

    makePath(obj) {
        // Extract path data from fabric path object
        const points = [];
        if (obj.path) {
            // Convert fabric path commands to Lottie vertices
            for (const cmd of obj.path) {
                if (cmd[0] === 'M' || cmd[0] === 'L') {
                    points.push([cmd[1], cmd[2]]);
                } else if (cmd[0] === 'C') {
                    points.push([cmd[5], cmd[6]]);
                }
            }
        }

        const vertices = points.map(p => p);
        const inTangents = points.map(() => [0, 0]);
        const outTangents = points.map(() => [0, 0]);

        return {
            ty: 'sh',
            d: 1,
            ks: {
                a: 0,
                k: {
                    i: inTangents,
                    o: outTangents,
                    v: vertices,
                    c: true,
                },
            },
            nm: 'Path',
        };
    }

    makePolygonPath(obj) {
        const pts = obj.points || [];
        // Calculate bounding box min to get vertices relative to top-left
        const minX = pts.length ? Math.min(...pts.map(p => p.x)) : 0;
        const minY = pts.length ? Math.min(...pts.map(p => p.y)) : 0;
        const vertices = pts.map(p => [p.x - minX, p.y - minY]);
        const inTangents = pts.map(() => [0, 0]);
        const outTangents = pts.map(() => [0, 0]);

        return {
            ty: 'sh',
            d: 1,
            ks: {
                a: 0,
                k: {
                    i: inTangents,
                    o: outTangents,
                    v: vertices,
                    c: true,
                },
            },
            nm: 'Polygon Path',
        };
    }

    makeFill(layerId, obj) {
        const color = this.hexToLottieColor(obj.fill);
        const fillKf = this.km.getKeyframes(layerId, 'fill');

        let colorProp;
        if (fillKf.length > 1) {
            const kfArray = [];
            for (let i = 0; i < fillKf.length; i++) {
                const c = this.hexToLottieColor(fillKf[i].value);
                if (i === fillKf.length - 1) {
                    kfArray.push({ t: fillKf[i].frame, s: c });
                } else {
                    const nextC = this.hexToLottieColor(fillKf[i + 1].value);
                    kfArray.push({
                        t: fillKf[i].frame,
                        s: c,
                        e: nextC,
                        i: { x: [0.667], y: [1] },
                        o: { x: [0.333], y: [0] },
                    });
                }
            }
            colorProp = { a: 1, k: kfArray };
        } else {
            colorProp = { a: 0, k: color };
        }

        return {
            ty: 'fl',
            c: colorProp,
            o: { a: 0, k: 100 },
            r: 1,
            bm: 0,
            nm: 'Fill',
        };
    }

    makeStroke(obj) {
        return {
            ty: 'st',
            c: { a: 0, k: this.hexToLottieColor(obj.stroke) },
            o: { a: 0, k: 100 },
            w: { a: 0, k: obj.strokeWidth || 1 },
            lc: 2,
            lj: 2,
            bm: 0,
            nm: 'Stroke',
        };
    }

    hexToLottieColor(hex) {
        if (!hex || hex === 'transparent') return [0, 0, 0, 1];
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b, 1];
    }
}
