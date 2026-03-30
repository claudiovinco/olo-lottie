/**
 * Layer ID generation
 */

let layerCounter = 0;

export function nextLayerId() {
    return `layer_${++layerCounter}_${Date.now()}`;
}

export function setLayerCounter(n) {
    if (n >= layerCounter) layerCounter = n;
}
