/**
 * KeyframeManager - Manages animation keyframes and interpolation
 */

export class KeyframeManager {
    constructor(fps = 30, duration = 3) {
        this.fps = fps;
        this.duration = duration;
        this.totalFrames = Math.round(fps * duration);
        this.currentFrame = 0;
        // layerId -> property -> [{frame, value, easing}]
        this.keyframes = new Map();
        this.listeners = new Set();
    }

    setDuration(duration) {
        this.duration = duration;
        this.totalFrames = Math.round(this.fps * duration);
        if (this.currentFrame > this.totalFrames) {
            this.currentFrame = this.totalFrames;
        }
        this.notify();
    }

    setFps(fps) {
        this.fps = fps;
        this.totalFrames = Math.round(fps * this.duration);
        this.notify();
    }

    setCurrentFrame(frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.totalFrames));
        this.notify();
    }

    addKeyframe(layerId, property, frame, value, easing = 'linear') {
        const key = `${layerId}`;
        if (!this.keyframes.has(key)) {
            this.keyframes.set(key, {});
        }
        const layerKf = this.keyframes.get(key);
        if (!layerKf[property]) {
            layerKf[property] = [];
        }

        // Remove existing keyframe at this frame
        layerKf[property] = layerKf[property].filter(kf => kf.frame !== frame);
        layerKf[property].push({ frame, value, easing });
        layerKf[property].sort((a, b) => a.frame - b.frame);

        this.notify();
    }

    removeKeyframe(layerId, property, frame) {
        const key = `${layerId}`;
        const layerKf = this.keyframes.get(key);
        if (!layerKf || !layerKf[property]) return;

        layerKf[property] = layerKf[property].filter(kf => kf.frame !== frame);
        if (layerKf[property].length === 0) {
            delete layerKf[property];
        }

        this.notify();
    }

    getKeyframes(layerId, property) {
        const key = `${layerId}`;
        const layerKf = this.keyframes.get(key);
        if (!layerKf) return [];
        return layerKf[property] || [];
    }

    getAllKeyframesForLayer(layerId) {
        const key = `${layerId}`;
        return this.keyframes.get(key) || {};
    }

    getValueAtFrame(layerId, property, frame) {
        const keyframes = this.getKeyframes(layerId, property);
        if (keyframes.length === 0) return null;

        // Exact match
        const exact = keyframes.find(kf => kf.frame === frame);
        if (exact) return exact.value;

        // Before first keyframe
        if (frame <= keyframes[0].frame) return keyframes[0].value;

        // After last keyframe
        if (frame >= keyframes[keyframes.length - 1].frame) {
            return keyframes[keyframes.length - 1].value;
        }

        // Interpolate between two keyframes
        let prev = keyframes[0];
        let next = keyframes[1];
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (keyframes[i].frame <= frame && keyframes[i + 1].frame >= frame) {
                prev = keyframes[i];
                next = keyframes[i + 1];
                break;
            }
        }

        const t = (frame - prev.frame) / (next.frame - prev.frame);
        return this.interpolate(prev.value, next.value, t, next.easing);
    }

    interpolate(from, to, t, easing) {
        const easedT = this.applyEasing(t, easing);

        // Number interpolation
        if (typeof from === 'number' && typeof to === 'number') {
            return from + (to - from) * easedT;
        }

        // Color interpolation (hex)
        if (typeof from === 'string' && from.startsWith('#')) {
            return this.interpolateColor(from, to, easedT);
        }

        // Object interpolation (e.g., {x, y})
        if (typeof from === 'object' && from !== null) {
            const result = {};
            for (const key of Object.keys(from)) {
                if (typeof from[key] === 'number') {
                    result[key] = from[key] + (to[key] - from[key]) * easedT;
                } else {
                    result[key] = easedT < 0.5 ? from[key] : to[key];
                }
            }
            return result;
        }

        // No interpolation possible
        return easedT < 0.5 ? from : to;
    }

    applyEasing(t, easing) {
        switch (easing) {
            case 'linear':
                return t;
            case 'easeIn':
                return t * t;
            case 'easeOut':
                return t * (2 - t);
            case 'easeInOut':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'easeInCubic':
                return t * t * t;
            case 'easeOutCubic':
                return (t - 1) * (t - 1) * (t - 1) + 1;
            default:
                return t;
        }
    }

    interpolateColor(from, to, t) {
        const f = this.hexToRgb(from);
        const toRgb = this.hexToRgb(to);
        if (!f || !toRgb) return from;

        const r = Math.round(f.r + (toRgb.r - f.r) * t);
        const g = Math.round(f.g + (toRgb.g - f.g) * t);
        const b = Math.round(f.b + (toRgb.b - f.b) * t);

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    }

    removeAllKeyframes(layerId) {
        const key = `${layerId}`;
        this.keyframes.delete(key);
        this.notify();
    }

    hasKeyframeAt(layerId, property, frame) {
        const keyframes = this.getKeyframes(layerId, property);
        return keyframes.some(kf => kf.frame === frame);
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(fn => fn());
    }

    toJSON() {
        const data = {};
        this.keyframes.forEach((props, layerId) => {
            data[layerId] = props;
        });
        return {
            fps: this.fps,
            duration: this.duration,
            totalFrames: this.totalFrames,
            keyframes: data,
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.fps = data.fps || 30;
        this.duration = data.duration || 3;
        this.totalFrames = data.totalFrames || Math.round(this.fps * this.duration);
        this.keyframes.clear();
        if (data.keyframes) {
            for (const [layerId, props] of Object.entries(data.keyframes)) {
                this.keyframes.set(layerId, props);
            }
        }
        this.notify();
    }
}
