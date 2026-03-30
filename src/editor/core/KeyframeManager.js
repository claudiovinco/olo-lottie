/**
 * KeyframeManager - Manages animation keyframes and interpolation
 * Optimized with interpolation cache, binary search, and snapshot versioning
 */

import { applyEasing } from '../utils/easing';
import { hexToRgb, interpolateColor } from '../utils/color';

export class KeyframeManager {
    constructor(fps = 30, duration = 3) {
        this.fps = fps;
        this.duration = duration;
        this.totalFrames = Math.round(fps * duration);
        this.currentFrame = 0;
        this.keyframes = new Map();
        this.listeners = new Set();
        this._version = 0;
        this._cache = new Map();
    }

    _invalidateCache() {
        this._cache.clear();
    }

    getSnapshotVersion() {
        return this._version;
    }

    setDuration(duration) {
        this.duration = duration;
        this.totalFrames = Math.round(this.fps * duration);
        if (this.currentFrame > this.totalFrames) {
            this.currentFrame = this.totalFrames;
        }
        this._invalidateCache();
        this.notify();
    }

    setFps(fps) {
        this.fps = fps;
        this.totalFrames = Math.round(fps * this.duration);
        this._invalidateCache();
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

        layerKf[property] = layerKf[property].filter(kf => kf.frame !== frame);
        layerKf[property].push({ frame, value, easing });
        layerKf[property].sort((a, b) => a.frame - b.frame);

        this._invalidateCache();
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

        this._invalidateCache();
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
        const cacheKey = `${layerId}|${property}|${frame}`;
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        const keyframes = this.getKeyframes(layerId, property);
        if (keyframes.length === 0) return null;

        let result;

        // Exact match via binary search
        const exactIdx = this._binarySearch(keyframes, frame);
        if (exactIdx >= 0) {
            result = keyframes[exactIdx].value;
        } else if (frame <= keyframes[0].frame) {
            result = keyframes[0].value;
        } else if (frame >= keyframes[keyframes.length - 1].frame) {
            result = keyframes[keyframes.length - 1].value;
        } else {
            // Find surrounding keyframes via binary search
            let lo = 0, hi = keyframes.length - 1;
            while (lo < hi - 1) {
                const mid = (lo + hi) >> 1;
                if (keyframes[mid].frame <= frame) lo = mid;
                else hi = mid;
            }
            const prev = keyframes[lo];
            const next = keyframes[hi];
            const t = (frame - prev.frame) / (next.frame - prev.frame);
            result = this.interpolate(prev.value, next.value, t, next.easing);
        }

        this._cache.set(cacheKey, result);
        return result;
    }

    _binarySearch(keyframes, frame) {
        let lo = 0, hi = keyframes.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (keyframes[mid].frame === frame) return mid;
            if (keyframes[mid].frame < frame) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    interpolate(from, to, t, easing) {
        const easedT = applyEasing(t, easing);

        if (typeof from === 'number' && typeof to === 'number') {
            return from + (to - from) * easedT;
        }

        if (typeof from === 'string' && from.startsWith('#')) {
            return interpolateColor(from, to, easedT);
        }

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

        return easedT < 0.5 ? from : to;
    }

    removeAllKeyframes(layerId) {
        const key = `${layerId}`;
        this.keyframes.delete(key);
        this._invalidateCache();
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
        this._version++;
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
        this._invalidateCache();
        this.notify();
    }
}
