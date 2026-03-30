/**
 * Shared easing functions and Lottie bezier curve mappings
 */

const easingFunctions = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (t - 1) ** 3 + 1,
};

const lottieBeziers = {
    linear: { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } },
    easeIn: { i: { x: [1], y: [1] }, o: { x: [0.42], y: [0] } },
    easeOut: { i: { x: [0.58], y: [1] }, o: { x: [0], y: [0] } },
    easeInOut: { i: { x: [0.58], y: [1] }, o: { x: [0.42], y: [0] } },
    easeInCubic: { i: { x: [1], y: [1] }, o: { x: [0.55], y: [0] } },
    easeOutCubic: { i: { x: [0.45], y: [1] }, o: { x: [0], y: [0] } },
};

const defaultBezier = { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] } };

export function applyEasing(t, easing) {
    return (easingFunctions[easing] || easingFunctions.linear)(t);
}

export function getEasingBezier(easing) {
    return lottieBeziers[easing] || defaultBezier;
}
