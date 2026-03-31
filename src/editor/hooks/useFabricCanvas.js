import { useEffect } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, Ellipse, Line, IText, Path, Polygon, PencilBrush } from 'fabric';
import { nextLayerId } from '../utils/layerId';
import { generateStarPoints, generatePolygonPoints, generateArrowPath } from '../utils/geometry';

export default function useFabricCanvas({
    canvasElRef, fabricCanvasRef, dispatch, keyframeManager,
    bonesCanvasRef, bonesDrawRef, state,
    isDrawingRef, drawStartRef, tempShapeRef,
    penPointsRef, penLinesRef, penPreviewLineRef,
    isPanningRef, panStartRef, isUserInteractingRef,
    currentFrameRef, finalizePenPathRef,
    layersRef, showBonesRef, selectedLayerIdRef,
    activeToolRef, zoomRef
}) {
    // Initialize Fabric canvas + ALL event handlers
    useEffect(() => {
        if (!canvasElRef.current) return;

        const canvas = new FabricCanvas(canvasElRef.current, {
            width: state.canvasWidth,
            height: state.canvasHeight,
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true,
        });

        fabricCanvasRef.current = canvas;

        // Bone & anchor visualization overlay
        const isDraggingAnchorRef = { current: false, layerId: null, startX: 0, startY: 0 };

        // Helper: canvas coords -> bones overlay coords
        // The bones canvas now covers canvas-area, but Fabric canvas is centered inside canvas-container
        function toScreen(x, y) {
            const vpt = canvas.viewportTransform;
            // Fabric canvas position in viewport
            const fabricX = x * vpt[0] + vpt[4];
            const fabricY = y * vpt[3] + vpt[5];

            // Offset: Fabric canvas element position relative to bones canvas (canvas-area)
            if (!bonesCanvasRef.current || !canvas.lowerCanvasEl) return { x: fabricX, y: fabricY };
            const bonesRect = bonesCanvasRef.current.getBoundingClientRect();
            const fabricRect = canvas.lowerCanvasEl.getBoundingClientRect();
            return {
                x: fabricX + (fabricRect.left - bonesRect.left),
                y: fabricY + (fabricRect.top - bonesRect.top),
            };
        }

        // Get anchor world position using Fabric's getCenterPoint()
        // Anchor is stored in SCALED coords relative to object top-left
        function getAnchorWorld(layer) {
            const obj = layer.fabricObject;
            if (!obj) return null;
            const ax = layer.anchorX || 0;
            const ay = layer.anchorY || 0;
            const sx = obj.scaleX || 1;
            const sy = obj.scaleY || 1;
            const w = obj.width || 0;
            const h = obj.height || 0;

            // Offset from center in scaled coords
            const cx = ax - w * sx / 2;
            const cy = ay - h * sy / 2;

            // Rotate offset by object angle
            const rad = ((obj.angle || 0) * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rx = cx * cos - cy * sin;
            const ry = cx * sin + cy * cos;

            // Add rotated offset to world center
            const center = obj.getCenterPoint();
            return { x: center.x + rx, y: center.y + ry };
        }

        // Inverse: convert world pointer to local anchor coords (scaled, top-left-relative)
        function worldToAnchor(obj, worldX, worldY) {
            const center = obj.getCenterPoint();
            const dx = worldX - center.x;
            const dy = worldY - center.y;

            // Un-rotate
            const rad = -((obj.angle || 0) * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            // Center-relative -> top-left-relative (scaled)
            const sx = obj.scaleX || 1;
            const sy = obj.scaleY || 1;
            const w = obj.width || 0;
            const h = obj.height || 0;
            return { x: localX + w * sx / 2, y: localY + h * sy / 2 };
        }

        // Get object center in world coords
        function getCenterWorld(obj) {
            return obj.getCenterPoint();
        }

        const drawBones = () => {
            if (!bonesCanvasRef.current) return;
            const ctx = bonesCanvasRef.current.getContext('2d');
            if (!ctx) return;

            const w = bonesCanvasRef.current.width;
            const h = bonesCanvasRef.current.height;
            ctx.clearRect(0, 0, w, h);

            if (!showBonesRef.current) return;

            const layers = layersRef.current;
            const selId = selectedLayerIdRef.current;

            // 1. Draw object centers (small grey dot) and anchor points (colored) for ALL layers
            layers.forEach(layer => {
                const obj = layer.fabricObject;
                if (!obj || layer.visible === false) return;

                // Object center
                const center = getCenterWorld(obj);
                const cs = toScreen(center.x, center.y);
                ctx.beginPath();
                ctx.arc(cs.x, cs.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(108, 112, 134, 0.6)';
                ctx.fill();

                // Anchor/pivot point
                const anchor = getAnchorWorld(layer);
                const as = toScreen(anchor.x, anchor.y);
                const isSelected = layer.id === selId;
                const hasCustomAnchor = layer.anchorX || layer.anchorY;

                if (hasCustomAnchor || isSelected) {
                    // Draw target crosshair — large and visible
                    const size = isSelected ? 14 : 9;
                    ctx.save();

                    // Outer glow for visibility on any background
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.lineWidth = isSelected ? 4 : 2.5;
                    ctx.beginPath();
                    ctx.moveTo(as.x - size, as.y);
                    ctx.lineTo(as.x + size, as.y);
                    ctx.moveTo(as.x, as.y - size);
                    ctx.lineTo(as.x, as.y + size);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(as.x, as.y, size, 0, Math.PI * 2);
                    ctx.stroke();

                    // Main colored crosshair
                    ctx.strokeStyle = isSelected ? '#ff4081' : 'rgba(255, 64, 129, 0.6)';
                    ctx.lineWidth = isSelected ? 2.5 : 1.5;
                    ctx.beginPath();
                    ctx.moveTo(as.x - size, as.y);
                    ctx.lineTo(as.x + size, as.y);
                    ctx.moveTo(as.x, as.y - size);
                    ctx.lineTo(as.x, as.y + size);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(as.x, as.y, size, 0, Math.PI * 2);
                    ctx.stroke();

                    // Center dot (drag handle)
                    ctx.beginPath();
                    ctx.arc(as.x, as.y, isSelected ? 5 : 3, 0, Math.PI * 2);
                    ctx.fillStyle = isSelected ? '#ff4081' : 'rgba(255, 64, 129, 0.7)';
                    ctx.fill();

                    ctx.restore();
                } else if (isSelected) {
                    // Selected but no custom anchor — show default position indicator
                    ctx.save();
                    ctx.strokeStyle = 'rgba(243, 139, 168, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.arc(cs.x, cs.y, 8, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }
            });

            // 2. Draw bone lines between parent anchor and child anchor
            layers.forEach(layer => {
                if (!layer.parentId) return;
                const parentLayer = layers.find(l => l.id === layer.parentId);
                if (!parentLayer) return;

                const childAnchor = getAnchorWorld(layer);
                const parentAnchor = getAnchorWorld(parentLayer);
                if (!childAnchor || !parentAnchor) return;

                const cs = toScreen(childAnchor.x, childAnchor.y);
                const ps = toScreen(parentAnchor.x, parentAnchor.y);

                // Bone line (tapered shape for visual clarity)
                ctx.save();
                const dx = cs.x - ps.x;
                const dy = cs.y - ps.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 2) {
                    const nx = -dy / len * 4; // perpendicular offset
                    const ny = dx / len * 4;

                    ctx.fillStyle = 'rgba(250, 179, 135, 0.25)';
                    ctx.strokeStyle = 'rgba(250, 179, 135, 0.7)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(ps.x, ps.y);
                    ctx.lineTo(cs.x + nx, cs.y + ny);
                    ctx.lineTo(cs.x, cs.y);
                    ctx.lineTo(cs.x - nx, cs.y - ny);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }

                // Joint circles at both ends
                [ps, cs].forEach((pt, i) => {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, i === 0 ? 5 : 4, 0, Math.PI * 2);
                    ctx.fillStyle = i === 0 ? 'rgba(250, 179, 135, 0.9)' : 'rgba(250, 179, 135, 0.7)';
                    ctx.fill();
                    ctx.strokeStyle = '#1e1e2e';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
                ctx.restore();
            });
        };
        canvas.on('after:render', drawBones);
        bonesDrawRef.current = drawBones;

        // --- Interactive anchor point dragging ---
        // Detect click near selected layer's anchor and allow dragging
        canvas.on('mouse:down:before', (e) => {
            if (!showBonesRef.current) return;
            const selId = selectedLayerIdRef.current;
            if (!selId) return;
            const selLayer = layersRef.current.find(l => l.id === selId);
            if (!selLayer?.fabricObject) return;

            const pointer = canvas.getScenePoint(e.e);
            const anchor = getAnchorWorld(selLayer);
            if (!anchor) return;

            const dist = Math.sqrt((pointer.x - anchor.x) ** 2 + (pointer.y - anchor.y) ** 2);
            const threshold = 12 / (canvas.viewportTransform[0] || 1); // scale-aware threshold

            if (dist < threshold) {
                isDraggingAnchorRef.current = true;
                isDraggingAnchorRef.layerId = selId;
                // Prevent Fabric from selecting/moving the object
                e.e.stopPropagation();
                canvas.selection = false;
                if (selLayer.fabricObject) {
                    selLayer.fabricObject.selectable = false;
                }
            }
        });

        canvas.on('mouse:move', (e) => {
            if (!isDraggingAnchorRef.current) return;
            const layerId = isDraggingAnchorRef.layerId;
            const layer = layersRef.current.find(l => l.id === layerId);
            if (!layer?.fabricObject) return;

            const pointer = canvas.getScenePoint(e.e);
            const obj = layer.fabricObject;

            // Convert world pointer to local (un-rotated) anchor coords
            const local = worldToAnchor(obj, pointer.x, pointer.y);

            dispatch({
                type: 'SET_ANCHOR',
                payload: { id: layerId, anchorX: Math.round(local.x), anchorY: Math.round(local.y) },
            });
            canvas.requestRenderAll();
        });

        canvas.on('mouse:up', () => {
            if (isDraggingAnchorRef.current) {
                const layerId = isDraggingAnchorRef.layerId;
                const layer = layersRef.current.find(l => l.id === layerId);
                if (layer?.fabricObject) {
                    layer.fabricObject.selectable = true;
                }
                canvas.selection = true;
                isDraggingAnchorRef.current = false;
                isDraggingAnchorRef.layerId = null;
            }
            // Reset FK tracking
            canvas.getObjects().forEach(obj => {
                delete obj._oloPrevLeft;
                delete obj._oloPrevTop;
                delete obj._oloPrevAngle;
                delete obj._oloBoneDist;
                delete obj._oloBoneAngleOffset;
                delete obj._oloBoneLen;
            });
        });

        // Selection events
        canvas.on('selection:created', (e) => {
            const obj = e.selected?.[0];
            if (obj && obj._oloLayerId) {
                dispatch({ type: 'SELECT_LAYER', payload: obj._oloLayerId });
            }
        });

        canvas.on('selection:updated', (e) => {
            const obj = e.selected?.[0];
            if (obj && obj._oloLayerId) {
                dispatch({ type: 'SELECT_LAYER', payload: obj._oloLayerId });
            }
        });

        canvas.on('selection:cleared', () => {
            dispatch({ type: 'SELECT_LAYER', payload: null });
        });

        // --- FK (Forward Kinematics): propagate parent transforms to children ---

        function getDescendantObjects(parentId) {
            const layers = layersRef.current;
            const result = [];
            const stack = [parentId];
            while (stack.length) {
                const pid = stack.pop();
                layers.forEach(l => {
                    if (l.parentId === pid && l.fabricObject) {
                        result.push(l);
                        stack.push(l.id);
                    }
                });
            }
            return result;
        }

        // === RIGID BONE FK SYSTEM ===
        // Model: child's anchor is PINNED to parent's anchor (shoulder-arm)
        // Child can only ROTATE around the joint, never detach.

        // Snap a child so its anchor is exactly at the parent's anchor
        function snapChildToParent(childLayer) {
            const cObj = childLayer.fabricObject;
            if (!cObj || !childLayer.parentId) return;
            const parentLayer = layersRef.current.find(l => l.id === childLayer.parentId);
            if (!parentLayer?.fabricObject) return;

            const pObj = parentLayer.fabricObject;
            // Parent's anchor in world coords
            const pRad = ((pObj.angle || 0) * Math.PI) / 180;
            const pAx = parentLayer.anchorX || 0;
            const pAy = parentLayer.anchorY || 0;
            const jointX = (pObj.left || 0) + pAx * Math.cos(pRad) - pAy * Math.sin(pRad);
            const jointY = (pObj.top || 0) + pAx * Math.sin(pRad) + pAy * Math.cos(pRad);

            // Child's anchor in world coords
            const cRad = ((cObj.angle || 0) * Math.PI) / 180;
            const cAx = childLayer.anchorX || 0;
            const cAy = childLayer.anchorY || 0;
            const cAnchorX = (cObj.left || 0) + cAx * Math.cos(cRad) - cAy * Math.sin(cRad);
            const cAnchorY = (cObj.top || 0) + cAx * Math.sin(cRad) + cAy * Math.cos(cRad);

            // Snap: move child so its anchor lands on the joint
            cObj.left += jointX - cAnchorX;
            cObj.top += jointY - cAnchorY;
            cObj.setCoords();
        }

        // FK: when parent MOVES, children follow (translation)
        canvas.on('object:moving', (e) => {
            isUserInteractingRef.current = true;
            const obj = e.target;
            if (!obj || !obj._oloLayerId) return;
            const movingLayer = layersRef.current.find(l => l.id === obj._oloLayerId);

            // If this object HAS a parent → constrain: convert drag to rotation only
            if (movingLayer?.parentId) {
                const parentLayer = layersRef.current.find(l => l.id === movingLayer.parentId);
                if (parentLayer?.fabricObject) {
                    const pObj = parentLayer.fabricObject;
                    const pRad = ((pObj.angle || 0) * Math.PI) / 180;
                    const pAx = parentLayer.anchorX || 0;
                    const pAy = parentLayer.anchorY || 0;
                    const jointX = (pObj.left || 0) + pAx * Math.cos(pRad) - pAy * Math.sin(pRad);
                    const jointY = (pObj.top || 0) + pAx * Math.sin(pRad) + pAy * Math.cos(pRad);

                    // Compute angle from joint to mouse position (using child's center as proxy)
                    const mouseAngle = Math.atan2(obj.top - jointY, obj.left - jointX);

                    // Compute where child's left/top should be at this angle, keeping distance fixed
                    const cAx = movingLayer.anchorX || 0;
                    const cAy = movingLayer.anchorY || 0;
                    const cRad = ((obj.angle || 0) * Math.PI) / 180;

                    // Distance from joint to child's left/top (fixed)
                    if (obj._oloBoneDist == null) {
                        const oldCAnchX = (obj._oloPrevLeft || obj.left) + cAx * Math.cos(cRad) - cAy * Math.sin(cRad);
                        const oldCAnchY = (obj._oloPrevTop || obj.top) + cAx * Math.sin(cRad) + cAy * Math.cos(cRad);
                        const ddx = (obj._oloPrevLeft || obj.left) - oldCAnchX;
                        const ddy = (obj._oloPrevTop || obj.top) - oldCAnchY;
                        obj._oloBoneDist = Math.sqrt(ddx * ddx + ddy * ddy);
                        obj._oloBoneAngleOffset = Math.atan2(ddy, ddx);
                        // Distance from joint to child anchor
                        const jdx = oldCAnchX - jointX;
                        const jdy = oldCAnchY - jointY;
                        obj._oloBoneLen = Math.sqrt(jdx * jdx + jdy * jdy) || 1;
                    }

                    // Position child's anchor on circle around joint
                    const newAnchorX = jointX + obj._oloBoneLen * Math.cos(mouseAngle);
                    const newAnchorY = jointY + obj._oloBoneLen * Math.sin(mouseAngle);

                    // Compute child left/top from anchor position
                    obj.left = newAnchorX - cAx * Math.cos(cRad) + cAy * Math.sin(cRad);
                    obj.top = newAnchorY - cAx * Math.sin(cRad) - cAy * Math.cos(cRad);
                    obj.setCoords();
                }
            }

            // Propagate translation to descendants
            const prevLeft = obj._oloPrevLeft != null ? obj._oloPrevLeft : obj.left;
            const prevTop = obj._oloPrevTop != null ? obj._oloPrevTop : obj.top;
            const dx = obj.left - prevLeft;
            const dy = obj.top - prevTop;

            obj._oloPrevLeft = obj.left;
            obj._oloPrevTop = obj.top;

            if (dx === 0 && dy === 0) return;

            const descendants = getDescendantObjects(obj._oloLayerId);
            descendants.forEach(child => {
                const cObj = child.fabricObject;
                cObj.left += dx;
                cObj.top += dy;
                cObj.setCoords();
                // Re-snap grandchildren to maintain chain
                snapChildToParent(child);
                cObj._oloPrevLeft = cObj.left;
                cObj._oloPrevTop = cObj.top;
            });

            if (descendants.length > 0) canvas.requestRenderAll();
        });

        // FK: when parent ROTATES, add dAngle to children + snap to joint
        canvas.on('object:rotating', (e) => {
            isUserInteractingRef.current = true;
            const obj = e.target;
            if (!obj || !obj._oloLayerId) return;

            const prevAngle = obj._oloPrevAngle != null ? obj._oloPrevAngle : obj.angle;
            const dAngle = obj.angle - prevAngle;
            obj._oloPrevAngle = obj.angle;
            if (dAngle === 0) return;

            // Process direct children first, then their children (breadth-first)
            const descendants = getDescendantObjects(obj._oloLayerId);
            descendants.forEach(child => {
                const cObj = child.fabricObject;
                // Inherit rotation
                cObj.angle = (cObj.angle || 0) + dAngle;
                cObj.setCoords();
                // Snap anchor to parent's anchor (maintains joint connection)
                snapChildToParent(child);
                cObj._oloPrevLeft = cObj.left;
                cObj._oloPrevTop = cObj.top;
                cObj._oloPrevAngle = cObj.angle;
            });

            if (descendants.length > 0) canvas.requestRenderAll();
        });

        // Block keyframe-apply while user is dragging/scaling/rotating
        canvas.on('object:scaling', () => { isUserInteractingRef.current = true; });

        // Object modified (moved, scaled, rotated) - auto-keyframe
        canvas.on('object:modified', (e) => {
            const obj = e.target;
            if (!obj || !obj._oloLayerId) return;
            isUserInteractingRef.current = false;

            const layerId = obj._oloLayerId;

            // Auto-keyframe: if keyframes exist for a property, update/create at current frame
            const propsToCheck = [
                { prop: 'left', val: obj.left },
                { prop: 'top', val: obj.top },
                { prop: 'scaleX', val: obj.scaleX },
                { prop: 'scaleY', val: obj.scaleY },
                { prop: 'angle', val: obj.angle },
                { prop: 'opacity', val: obj.opacity },
            ];

            propsToCheck.forEach(({ prop, val }) => {
                const existing = keyframeManager.getKeyframes(layerId, prop);
                if (existing.length > 0) {
                    keyframeManager.addKeyframe(layerId, prop, currentFrameRef.current, val);
                }
            });

            dispatch({
                type: 'UPDATE_LAYER',
                payload: { id: layerId, fabricObject: obj },
            });
        });

        // Pencil path created
        canvas.on('path:created', (e) => {
            const path = e.path;
            if (!path) return;
            const id = nextLayerId();
            path._oloLayerId = id;
            path.set({ selectable: true, evented: true });
            dispatch({
                type: 'ADD_LAYER',
                payload: {
                    id, name: 'Freehand', type: 'path',
                    visible: true, locked: false,
                    color: path.stroke || '#f38ba8',
                    fabricObject: path,
                },
            });
            dispatch({ type: 'SET_TOOL', payload: 'select' });
        });

        // ===== Drawing handlers via Fabric.js native events =====

        canvas.on('mouse:down', (opt) => {
            const tool = activeToolRef.current;
            if (tool === 'select' || tool === 'pencil') return;

            const pointer = opt.scenePoint;
            const nativeEvent = opt.e;

            // Pan tool
            if (tool === 'pan') {
                isPanningRef.current = true;
                panStartRef.current = { x: nativeEvent.clientX, y: nativeEvent.clientY };
                canvas.defaultCursor = 'grabbing';
                return;
            }

            // Zoom tools
            if (tool === 'zoom_in' || tool === 'zoom_out') {
                const factor = tool === 'zoom_in' ? 1.25 : 0.8;
                const curZoom = zoomRef.current || 1;
                const newZoom = Math.max(0.1, Math.min(10, curZoom * factor));
                dispatch({ type: 'SET_ZOOM', payload: newZoom });
                const vpt = canvas.viewportTransform.slice();
                vpt[0] = newZoom;
                vpt[3] = newZoom;
                vpt[4] = pointer.x * (1 - newZoom);
                vpt[5] = pointer.y * (1 - newZoom);
                canvas.setViewportTransform(vpt);
                canvas.renderAll();
                return;
            }

            // Eyedropper tool
            if (tool === 'eyedropper') {
                if (opt.target && opt.target.fill) {
                    window.dispatchEvent(new CustomEvent('olo-lottie-eyedropper', {
                        detail: { color: opt.target.fill }
                    }));
                }
                return;
            }

            // Eraser tool
            if (tool === 'eraser') {
                if (opt.target && opt.target._oloLayerId) {
                    canvas.remove(opt.target);
                    dispatch({ type: 'REMOVE_LAYER', payload: opt.target._oloLayerId });
                    keyframeManager.removeAllKeyframes(opt.target._oloLayerId);
                    canvas.renderAll();
                }
                return;
            }

            // Pen tool: click to add point
            if (tool === 'pen') {
                const points = penPointsRef.current;
                points.push({ x: pointer.x, y: pointer.y });

                if (points.length > 1) {
                    const prev = points[points.length - 2];
                    const line = new Line([prev.x, prev.y, pointer.x, pointer.y], {
                        stroke: '#89b4fa', strokeWidth: 2,
                        selectable: false, evented: false,
                        strokeDashArray: [5, 3],
                    });
                    penLinesRef.current.push(line);
                    canvas.add(line);
                }

                const dot = new Circle({
                    left: pointer.x - 3, top: pointer.y - 3,
                    radius: 3, fill: '#89b4fa',
                    selectable: false, evented: false,
                });
                penLinesRef.current.push(dot);
                canvas.add(dot);
                canvas.renderAll();
                return;
            }

            // Shape drawing tools
            isDrawingRef.current = true;
            drawStartRef.current = { x: pointer.x, y: pointer.y };

            const id = nextLayerId();
            let obj;
            let layerType;

            if (tool === 'rect') {
                obj = new Rect({
                    left: pointer.x, top: pointer.y, width: 0, height: 0,
                    fill: '#89b4fa', stroke: '#74c7ec', strokeWidth: 2,
                    selectable: false, evented: false,
                });
                layerType = 'rect';
            } else if (tool === 'roundrect') {
                obj = new Rect({
                    left: pointer.x, top: pointer.y, width: 0, height: 0,
                    rx: 12, ry: 12,
                    fill: '#89b4fa', stroke: '#74c7ec', strokeWidth: 2,
                    selectable: false, evented: false,
                });
                layerType = 'rect';
            } else if (tool === 'ellipse') {
                obj = new Ellipse({
                    left: pointer.x, top: pointer.y, rx: 0, ry: 0,
                    fill: '#a6e3a1', stroke: '#94e2d5', strokeWidth: 2,
                    selectable: false, evented: false,
                });
                layerType = 'ellipse';
            } else if (tool === 'star') {
                obj = new Polygon(generateStarPoints(0, 0, 0, 0, 5), {
                    left: pointer.x, top: pointer.y,
                    fill: '#f9e2af', stroke: '#fab387', strokeWidth: 2,
                    selectable: false, evented: false,
                });
                layerType = 'star';
            } else if (tool === 'polygon') {
                obj = new Polygon(generatePolygonPoints(0, 0, 0, 6), {
                    left: pointer.x, top: pointer.y,
                    fill: '#cba6f7', stroke: '#b4befe', strokeWidth: 2,
                    selectable: false, evented: false,
                });
                layerType = 'polygon';
            } else if (tool === 'triangle') {
                obj = new Polygon([
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                ], {
                    left: pointer.x, top: pointer.y,
                    fill: '#f38ba8', stroke: '#eba0ac', strokeWidth: 2,
                    selectable: false, evented: false,
                });
                layerType = 'triangle';
            } else if (tool === 'line') {
                obj = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                    stroke: '#cdd6f4', strokeWidth: 2,
                    selectable: false, evented: false,
                });
                layerType = 'line';
            } else if (tool === 'arrow') {
                obj = new Path(generateArrowPath(pointer.x, pointer.y, pointer.x, pointer.y), {
                    stroke: '#cdd6f4', strokeWidth: 2, fill: 'transparent',
                    selectable: false, evented: false,
                });
                layerType = 'arrow';
            } else if (tool === 'text') {
                obj = new IText('Text', {
                    left: pointer.x, top: pointer.y,
                    fontSize: 24, fill: '#cdd6f4', fontFamily: 'sans-serif',
                });
                obj._oloLayerId = id;
                canvas.add(obj);
                canvas.setActiveObject(obj);
                obj.enterEditing();
                dispatch({
                    type: 'ADD_LAYER',
                    payload: { id, name: 'Text', type: 'text', visible: true, locked: false, color: '#cdd6f4', fabricObject: obj },
                });
                dispatch({ type: 'SET_TOOL', payload: 'select' });
                isDrawingRef.current = false;
                return;
            }

            if (obj) {
                obj._oloLayerId = id;
                obj._oloLayerType = layerType;
                tempShapeRef.current = { obj, id, type: layerType };
                canvas.add(obj);
                canvas.renderAll();
            }
        });

        canvas.on('mouse:dblclick', (opt) => {
            const tool = activeToolRef.current;
            if (tool === 'pen' && penPointsRef.current.length >= 2) {
                const pointer = opt.scenePoint;
                const first = penPointsRef.current[0];
                const dist = Math.sqrt((pointer.x - first.x) ** 2 + (pointer.y - first.y) ** 2);
                const closed = dist < 20;
                finalizePenPathRef.current?.(closed);
            }
        });

        canvas.on('mouse:move', (opt) => {
            const tool = activeToolRef.current;
            const nativeEvent = opt.e;

            // Pan tool drag
            if (tool === 'pan' && isPanningRef.current) {
                const dx = nativeEvent.clientX - panStartRef.current.x;
                const dy = nativeEvent.clientY - panStartRef.current.y;
                panStartRef.current = { x: nativeEvent.clientX, y: nativeEvent.clientY };
                const vpt = canvas.viewportTransform.slice();
                vpt[4] += dx;
                vpt[5] += dy;
                canvas.setViewportTransform(vpt);
                canvas.renderAll();
                return;
            }

            // Pen tool preview line
            if (tool === 'pen' && penPointsRef.current.length > 0) {
                const pointer = opt.scenePoint;
                const lastPt = penPointsRef.current[penPointsRef.current.length - 1];
                if (penPreviewLineRef.current) {
                    canvas.remove(penPreviewLineRef.current);
                }
                const preview = new Line([lastPt.x, lastPt.y, pointer.x, pointer.y], {
                    stroke: '#89b4fa', strokeWidth: 1,
                    selectable: false, evented: false,
                    strokeDashArray: [3, 3], opacity: 0.5,
                });
                penPreviewLineRef.current = preview;
                canvas.add(preview);
                canvas.renderAll();
                return;
            }

            if (!isDrawingRef.current || !tempShapeRef.current) return;

            const pointer = opt.scenePoint;
            const start = drawStartRef.current;
            const { obj, type } = tempShapeRef.current;

            if (type === 'rect') {
                obj.set({
                    left: Math.min(start.x, pointer.x),
                    top: Math.min(start.y, pointer.y),
                    width: Math.abs(pointer.x - start.x),
                    height: Math.abs(pointer.y - start.y),
                });
            } else if (type === 'ellipse') {
                obj.set({
                    left: Math.min(start.x, pointer.x),
                    top: Math.min(start.y, pointer.y),
                    rx: Math.abs(pointer.x - start.x) / 2,
                    ry: Math.abs(pointer.y - start.y) / 2,
                });
            } else if (type === 'star') {
                const radius = Math.sqrt((pointer.x - start.x) ** 2 + (pointer.y - start.y) ** 2);
                const pts = generateStarPoints(0, 0, radius, radius * 0.4, 5);
                canvas.remove(obj);
                const newObj = new Polygon(pts, {
                    fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth,
                    selectable: false, evented: false,
                });
                newObj.set({ left: (newObj.left || 0) + start.x, top: (newObj.top || 0) + start.y });
                newObj.setCoords();
                newObj._oloLayerId = tempShapeRef.current.id;
                newObj._oloLayerType = 'star';
                tempShapeRef.current.obj = newObj;
                canvas.add(newObj);
            } else if (type === 'polygon') {
                const radius = Math.sqrt((pointer.x - start.x) ** 2 + (pointer.y - start.y) ** 2);
                const pts = generatePolygonPoints(0, 0, radius, 6);
                canvas.remove(obj);
                const newObj = new Polygon(pts, {
                    fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth,
                    selectable: false, evented: false,
                });
                newObj.set({ left: (newObj.left || 0) + start.x, top: (newObj.top || 0) + start.y });
                newObj.setCoords();
                newObj._oloLayerId = tempShapeRef.current.id;
                newObj._oloLayerType = 'polygon';
                tempShapeRef.current.obj = newObj;
                canvas.add(newObj);
            } else if (type === 'triangle') {
                const w = pointer.x - start.x;
                const h = pointer.y - start.y;
                const pts = [
                    { x: 0, y: -h / 2 },
                    { x: w / 2, y: h / 2 },
                    { x: -w / 2, y: h / 2 },
                ];
                canvas.remove(obj);
                const newObj = new Polygon(pts, {
                    fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth,
                    selectable: false, evented: false,
                });
                newObj.set({ left: (newObj.left || 0) + start.x + w / 2, top: (newObj.top || 0) + start.y + h / 2 });
                newObj.setCoords();
                newObj._oloLayerId = tempShapeRef.current.id;
                newObj._oloLayerType = 'triangle';
                tempShapeRef.current.obj = newObj;
                canvas.add(newObj);
            } else if (type === 'line') {
                obj.set({ x2: pointer.x, y2: pointer.y });
            } else if (type === 'arrow') {
                const pathData = generateArrowPath(start.x, start.y, pointer.x, pointer.y);
                canvas.remove(obj);
                const newObj = new Path(pathData, {
                    stroke: obj.stroke, strokeWidth: obj.strokeWidth,
                    fill: 'transparent', selectable: false, evented: false,
                });
                newObj._oloLayerId = tempShapeRef.current.id;
                newObj._oloLayerType = 'arrow';
                tempShapeRef.current.obj = newObj;
                canvas.add(newObj);
            }

            canvas.renderAll();
        });

        canvas.on('mouse:up', () => {
            // End pan
            if (isPanningRef.current) {
                isPanningRef.current = false;
                canvas.defaultCursor = 'grab';
                return;
            }

            if (!isDrawingRef.current || !tempShapeRef.current) return;
            isDrawingRef.current = false;

            const { obj, id, type } = tempShapeRef.current;

            // If too small, remove it
            const minSize = 5;
            let tooSmall = false;
            if (type === 'rect' && (obj.width < minSize || obj.height < minSize)) tooSmall = true;
            if (type === 'ellipse' && (obj.rx < minSize && obj.ry < minSize)) tooSmall = true;

            if (tooSmall) {
                canvas.remove(obj);
                tempShapeRef.current = null;
                return;
            }

            obj.set({ selectable: true, evented: true });

            const names = {
                rect: 'Rectangle', ellipse: 'Ellipse', line: 'Line',
                star: 'Star', polygon: 'Polygon', triangle: 'Triangle', arrow: 'Arrow',
            };
            dispatch({
                type: 'ADD_LAYER',
                payload: {
                    id, name: names[type] || type, type,
                    visible: true, locked: false,
                    color: obj.fill || obj.stroke || '#89b4fa',
                    fabricObject: obj,
                },
            });

            dispatch({ type: 'SET_TOOL', payload: 'select' });
            canvas.setActiveObject(obj);
            canvas.renderAll();
            tempShapeRef.current = null;
        });

        return () => {
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, []); // Only initialize once
}
