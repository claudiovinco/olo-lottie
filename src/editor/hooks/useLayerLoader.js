import { useEffect } from 'react';
import { Rect, Circle, Ellipse, IText, Line, Path, Polygon } from 'fabric';
import { setLayerCounter } from '../utils/layerId';

export default function useLayerLoader({ fabricCanvasRef, dispatch }) {
    // Load saved layers from editor_state (reconstruct Fabric objects)
    useEffect(() => {
        const handler = () => {
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;
            const savedLayers = window._oloLottieLoadLayers;
            if (!savedLayers || savedLayers.length === 0) return;
            delete window._oloLottieLoadLayers;

            savedLayers.forEach(layerData => {
                const p = layerData.props || {};
                const id = layerData.id;
                let obj = null;

                const baseOpts = {
                    left: p.left || 0,
                    top: p.top || 0,
                    scaleX: p.scaleX ?? 1,
                    scaleY: p.scaleY ?? 1,
                    angle: p.angle || 0,
                    opacity: p.opacity ?? 1,
                    fill: p.fill || '#89b4fa',
                    stroke: p.stroke || '',
                    strokeWidth: p.strokeWidth || 0,
                    flipX: p.flipX || false,
                    flipY: p.flipY || false,
                    selectable: true,
                    evented: true,
                };

                const type = layerData.type;

                if (type === 'rect') {
                    obj = new Rect({
                        ...baseOpts,
                        width: p.width || 100,
                        height: p.height || 100,
                        rx: p.rx || 0,
                        ry: p.ry || 0,
                    });
                } else if (type === 'ellipse') {
                    obj = new Ellipse({
                        ...baseOpts,
                        rx: p.rx || 50,
                        ry: p.ry || 50,
                    });
                } else if (type === 'circle') {
                    obj = new Circle({
                        ...baseOpts,
                        radius: p.radius || 50,
                    });
                } else if (type === 'text' || type === 'i-text') {
                    obj = new IText(p.text || 'Text', {
                        ...baseOpts,
                        fontSize: p.fontSize || 24,
                        fontFamily: p.fontFamily || 'sans-serif',
                        fontWeight: p.fontWeight || 'normal',
                        fontStyle: p.fontStyle || 'normal',
                        textAlign: p.textAlign || 'left',
                    });
                } else if (type === 'line') {
                    obj = new Line([p.x1 || 0, p.y1 || 0, p.x2 || 100, p.y2 || 100], {
                        ...baseOpts,
                    });
                } else if (type === 'path' || type === 'arrow') {
                    if (p.pathData) {
                        const pathStr = p.pathData.map(cmd => cmd.join(' ')).join(' ');
                        obj = new Path(pathStr, { ...baseOpts });
                    }
                } else if (type === 'star' || type === 'polygon' || type === 'triangle') {
                    if (p.points && p.points.length > 0) {
                        obj = new Polygon(p.points, { ...baseOpts });
                    }
                }

                // Fallback: try path or polygon from saved data
                if (!obj && p.pathData) {
                    const pathStr = p.pathData.map(cmd => cmd.join(' ')).join(' ');
                    obj = new Path(pathStr, { ...baseOpts });
                } else if (!obj && p.points) {
                    obj = new Polygon(p.points, { ...baseOpts });
                }

                if (obj) {
                    obj._oloLayerId = id;
                    obj._oloLayerType = type;
                    canvas.add(obj);
                    dispatch({
                        type: 'ADD_LAYER',
                        payload: {
                            id,
                            name: layerData.name || type,
                            type,
                            visible: layerData.visible !== false,
                            locked: layerData.locked || false,
                            color: layerData.color || '#89b4fa',
                            fabricObject: obj,
                            parentId: layerData.parentId || null,
                            anchorX: layerData.anchorX || 0,
                            anchorY: layerData.anchorY || 0,
                        },
                    });

                    // Update layerCounter to avoid ID collisions
                    const match = id.match(/^layer_(\d+)_/);
                    if (match) {
                        const num = parseInt(match[1]);
                        setLayerCounter(num);
                    }
                }
            });

            canvas.renderAll();
        };

        window.addEventListener('olo-lottie-load-layers', handler);
        // Also try immediately in case event already fired
        if (window._oloLottieLoadLayers) {
            setTimeout(handler, 100);
        }
        return () => window.removeEventListener('olo-lottie-load-layers', handler);
    }, []);
}
