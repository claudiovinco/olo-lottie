import { useEffect } from 'react';
import { PencilBrush } from 'fabric';

export default function useCanvasSync({ fabricCanvasRef, state, keyframeManager, isUserInteractingRef }) {
    // Update canvas dimensions
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.setDimensions({ width: state.canvasWidth, height: state.canvasHeight });
    }, [state.canvasWidth, state.canvasHeight]);

    // Update selection mode based on tool
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const isSelect = state.activeTool === 'select';
        const isEyedropper = state.activeTool === 'eyedropper';
        canvas.selection = isSelect;
        canvas.isDrawingMode = state.activeTool === 'pencil';

        if (state.activeTool === 'pan') {
            canvas.defaultCursor = 'grab';
            canvas.hoverCursor = 'grab';
        } else if (isEyedropper) {
            canvas.defaultCursor = 'crosshair';
            canvas.hoverCursor = 'crosshair';
        } else if (state.activeTool === 'zoom_in') {
            canvas.defaultCursor = 'zoom-in';
            canvas.hoverCursor = 'zoom-in';
        } else if (state.activeTool === 'zoom_out') {
            canvas.defaultCursor = 'zoom-out';
            canvas.hoverCursor = 'zoom-out';
        } else if (state.activeTool === 'eraser') {
            canvas.defaultCursor = 'not-allowed';
            canvas.hoverCursor = 'pointer';
        } else {
            canvas.defaultCursor = isSelect ? 'default' : 'crosshair';
            canvas.hoverCursor = isSelect ? 'move' : 'crosshair';
        }

        if (state.activeTool === 'pencil') {
            if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof PencilBrush)) {
                canvas.freeDrawingBrush = new PencilBrush(canvas);
            }
            canvas.freeDrawingBrush.color = '#f38ba8';
            canvas.freeDrawingBrush.width = 3;
        }

        canvas.forEachObject(obj => {
            obj.selectable = isSelect;
            obj.evented = isSelect || isEyedropper || state.activeTool === 'eraser';
        });
        canvas.renderAll();
    }, [state.activeTool]);

    // Handle layer visibility/lock changes
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        state.layers.forEach(layer => {
            if (layer.fabricObject) {
                layer.fabricObject.visible = layer.visible !== false;
                layer.fabricObject.selectable = !layer.locked && state.activeTool === 'select';
                layer.fabricObject.evented = !layer.locked && state.activeTool === 'select';
            }
        });
        canvas.renderAll();
    }, [state.layers, state.activeTool]);

    // Apply keyframe values at current frame (skip while user is dragging)
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || isUserInteractingRef.current) return;

        state.layers.forEach(layer => {
            const obj = layer.fabricObject;
            if (!obj) return;

            const props = ['left', 'top', 'scaleX', 'scaleY', 'angle', 'opacity'];
            props.forEach(prop => {
                const val = keyframeManager.getValueAtFrame(layer.id, prop, state.currentFrame);
                if (val !== null) {
                    obj.set(prop, val);
                }
            });

            const fillVal = keyframeManager.getValueAtFrame(layer.id, 'fill', state.currentFrame);
            if (fillVal !== null) {
                obj.set('fill', fillVal);
            }

            obj.setCoords();
        });

        canvas.renderAll();
    }, [state.currentFrame, state.layers]);
}
