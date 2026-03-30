import React, { useRef, useCallback, useEffect } from 'react';
import { useEditor } from '../core/EditorContext';
import { pointsToSVGPath } from '../utils/geometry';
import { nextLayerId } from '../utils/layerId';
import { Path, Line, Circle } from 'fabric';
import useFabricCanvas from '../hooks/useFabricCanvas';
import useCanvasSync from '../hooks/useCanvasSync';
import useSvgImport from '../hooks/useSvgImport';
import useLayerLoader from '../hooks/useLayerLoader';
import useBones from '../hooks/useBones';

export default function CanvasEditor() {
    const { state, dispatch, fabricCanvasRef, keyframeManager } = useEditor();
    const containerRef = useRef(null);
    const canvasElRef = useRef(null);
    const isDrawingRef = useRef(false);
    const drawStartRef = useRef(null);
    const tempShapeRef = useRef(null);
    const penPointsRef = useRef([]);
    const penLinesRef = useRef([]);
    const penPreviewLineRef = useRef(null);
    const isPanningRef = useRef(false);
    const panStartRef = useRef(null);
    const isUserInteractingRef = useRef(false);
    const currentFrameRef = useRef(0);
    const finalizePenPathRef = useRef(null);
    const layersRef = useRef(state.layers);
    const showBonesRef = useRef(state.showBones);
    const selectedLayerIdRef = useRef(state.selectedLayerId);
    const bonesCanvasRef = useRef(null);
    const bonesDrawRef = useRef(null);
    const activeToolRef = useRef(state.activeTool);
    const zoomRef = useRef(state.zoom);

    // Keep refs in sync with state (critical for Fabric event handler closures)
    useEffect(() => { currentFrameRef.current = state.currentFrame; }, [state.currentFrame]);
    useEffect(() => { activeToolRef.current = state.activeTool; }, [state.activeTool]);
    useEffect(() => { zoomRef.current = state.zoom; }, [state.zoom]);
    useEffect(() => { layersRef.current = state.layers; }, [state.layers]);
    useEffect(() => { showBonesRef.current = state.showBones; }, [state.showBones]);
    useEffect(() => { selectedLayerIdRef.current = state.selectedLayerId; }, [state.selectedLayerId]);

    // Pen tool finalization
    const finalizePenPath = useCallback((closed) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const points = penPointsRef.current;

        penLinesRef.current.forEach(l => canvas.remove(l));
        penLinesRef.current = [];
        if (penPreviewLineRef.current) {
            canvas.remove(penPreviewLineRef.current);
            penPreviewLineRef.current = null;
        }

        if (points.length < 2) {
            penPointsRef.current = [];
            canvas.renderAll();
            return;
        }

        const pathData = pointsToSVGPath(points, closed);
        const id = nextLayerId();
        const path = new Path(pathData, {
            fill: closed ? 'rgba(137,180,250,0.3)' : 'transparent',
            stroke: '#89b4fa', strokeWidth: 2,
            selectable: true, evented: true,
        });
        path._oloLayerId = id;
        canvas.add(path);
        canvas.setActiveObject(path);
        canvas.renderAll();

        dispatch({
            type: 'ADD_LAYER',
            payload: { id, name: closed ? 'Polygon' : 'Polyline', type: 'path', visible: true, locked: false, color: '#89b4fa', fabricObject: path },
        });
        dispatch({ type: 'SET_TOOL', payload: 'select' });
        penPointsRef.current = [];
    }, [dispatch]);

    finalizePenPathRef.current = finalizePenPath;

    // Refs object for hooks
    const refs = {
        isDrawingRef, drawStartRef, tempShapeRef,
        penPointsRef, penLinesRef, penPreviewLineRef,
        isPanningRef, panStartRef, isUserInteractingRef,
        currentFrameRef, finalizePenPathRef,
        layersRef, showBonesRef, selectedLayerIdRef,
        activeToolRef, zoomRef,
    };

    useFabricCanvas({
        canvasElRef, fabricCanvasRef, dispatch, keyframeManager,
        bonesCanvasRef, bonesDrawRef, state, ...refs,
    });

    useCanvasSync({ fabricCanvasRef, state, keyframeManager, isUserInteractingRef });
    useSvgImport({ fabricCanvasRef, dispatch });
    useLayerLoader({ fabricCanvasRef, dispatch });
    useBones({ bonesCanvasRef, bonesDrawRef, state });

    return (
        <div className="olo-lottie-canvas-area" style={{ position: 'relative' }}>
            <div className="olo-lottie-canvas-container" ref={containerRef}>
                <div className="olo-lottie-canvas-wrapper">
                    <canvas ref={canvasElRef} />
                </div>
            </div>
            <canvas
                ref={bonesCanvasRef}
                style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    pointerEvents: 'none', zIndex: 20,
                }}
            />
        </div>
    );
}
