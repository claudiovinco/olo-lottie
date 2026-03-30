import { useEffect } from 'react';
import { Rect, Circle, Ellipse } from 'fabric';
import { nextLayerId } from '../utils/layerId';

export default function useSvgImport({ fabricCanvasRef, dispatch }) {
    // SVG import handler
    useEffect(() => {
        const handler = (e) => {
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(e.detail.svg, 'image/svg+xml');
            const elements = svgDoc.querySelectorAll('rect, circle, ellipse, path, polygon, line');

            elements.forEach(el => {
                const id = nextLayerId();
                let obj;
                const tag = el.tagName.toLowerCase();

                if (tag === 'rect') {
                    obj = new Rect({
                        left: parseFloat(el.getAttribute('x') || 0),
                        top: parseFloat(el.getAttribute('y') || 0),
                        width: parseFloat(el.getAttribute('width') || 100),
                        height: parseFloat(el.getAttribute('height') || 100),
                        fill: el.getAttribute('fill') || '#89b4fa',
                        stroke: el.getAttribute('stroke') || '',
                        strokeWidth: parseFloat(el.getAttribute('stroke-width') || 0),
                        rx: parseFloat(el.getAttribute('rx') || 0),
                        ry: parseFloat(el.getAttribute('ry') || 0),
                    });
                } else if (tag === 'circle') {
                    const r = parseFloat(el.getAttribute('r') || 50);
                    obj = new Circle({
                        left: parseFloat(el.getAttribute('cx') || 0) - r,
                        top: parseFloat(el.getAttribute('cy') || 0) - r,
                        radius: r,
                        fill: el.getAttribute('fill') || '#89b4fa',
                        stroke: el.getAttribute('stroke') || '',
                        strokeWidth: parseFloat(el.getAttribute('stroke-width') || 0),
                    });
                } else if (tag === 'ellipse') {
                    const rx = parseFloat(el.getAttribute('rx') || 50);
                    const ry = parseFloat(el.getAttribute('ry') || 50);
                    obj = new Ellipse({
                        left: parseFloat(el.getAttribute('cx') || 0) - rx,
                        top: parseFloat(el.getAttribute('cy') || 0) - ry,
                        rx, ry,
                        fill: el.getAttribute('fill') || '#89b4fa',
                        stroke: el.getAttribute('stroke') || '',
                        strokeWidth: parseFloat(el.getAttribute('stroke-width') || 0),
                    });
                }

                if (obj) {
                    obj._oloLayerId = id;
                    canvas.add(obj);
                    dispatch({
                        type: 'ADD_LAYER',
                        payload: {
                            id, name: `SVG ${tag}`, type: tag,
                            visible: true, locked: false,
                            color: el.getAttribute('fill') || '#89b4fa',
                            fabricObject: obj,
                        },
                    });
                }
            });

            canvas.renderAll();
        };

        window.addEventListener('olo-lottie-import-svg', handler);
        return () => window.removeEventListener('olo-lottie-import-svg', handler);
    }, []);
}
