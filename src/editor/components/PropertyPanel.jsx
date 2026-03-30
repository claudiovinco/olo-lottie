import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, isDescendant } from '../core/EditorContext';

const OriginPointGrid = React.memo(function OriginPointGrid({ anchorX, anchorY, objWidth, objHeight, onSelect }) {
    const positions = [
        { label: 'TL', ax: 0, ay: 0 },
        { label: 'TC', ax: objWidth / 2, ay: 0 },
        { label: 'TR', ax: objWidth, ay: 0 },
        { label: 'ML', ax: 0, ay: objHeight / 2 },
        { label: 'CC', ax: objWidth / 2, ay: objHeight / 2 },
        { label: 'MR', ax: objWidth, ay: objHeight / 2 },
        { label: 'BL', ax: 0, ay: objHeight },
        { label: 'BC', ax: objWidth / 2, ay: objHeight },
        { label: 'BR', ax: objWidth, ay: objHeight },
    ];

    const isActive = (pos) => Math.abs((anchorX || 0) - pos.ax) < 2 && Math.abs((anchorY || 0) - pos.ay) < 2;

    return (
        <div className="olo-lottie-origin-grid">
            {positions.map((pos) => (
                <button
                    key={pos.label}
                    onClick={() => onSelect(Math.round(pos.ax), Math.round(pos.ay))}
                    title={pos.label}
                    className={`olo-lottie-origin-grid__btn ${isActive(pos) ? 'olo-lottie-origin-grid__btn--active' : ''}`}
                >
                    <span className={`olo-lottie-origin-grid__dot ${isActive(pos) ? 'olo-lottie-origin-grid__dot--active' : ''}`} />
                </button>
            ))}
        </div>
    );
});

const KfBtn = React.memo(function KfBtn({ layerId, property, currentFrame, keyframeManager, addKeyframeForProp }) {
    const hasKf = keyframeManager.hasKeyframeAt(layerId, property, currentFrame);
    return (
        <button
            className={`olo-lottie-keyframe-btn ${hasKf ? 'olo-lottie-keyframe-btn--active' : ''}`}
            onClick={() => { hasKf ? keyframeManager.removeKeyframe(layerId, property, currentFrame) : addKeyframeForProp(property); }}
            title={hasKf ? 'Remove keyframe' : 'Add keyframe'}
        />
    );
});

function getPropsFromObj(obj) {
    return {
        left: Math.round(obj.left || 0),
        top: Math.round(obj.top || 0),
        width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
        height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
        scaleXPct: Math.round((obj.scaleX || 1) * 100),
        scaleYPct: Math.round((obj.scaleY || 1) * 100),
        rawWidth: obj.width || 0,
        rawHeight: obj.height || 0,
        angle: Math.round(obj.angle || 0),
        opacity: Math.round((obj.opacity ?? 1) * 100),
        fill: obj.fill || '#000000',
        stroke: obj.stroke || '',
        strokeWidth: obj.strokeWidth || 0,
        rx: obj.rx || 0,
    };
}

export default function PropertyPanel() {
    const { state, dispatch, fabricCanvasRef, keyframeManager } = useEditor();
    const [props, setProps] = useState({});
    const [lockScale, setLockScale] = useState(true);

    const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId);

    useEffect(() => {
        const handler = (e) => {
            const color = e.detail?.color;
            if (!color || !selectedLayer?.fabricObject) return;
            const obj = selectedLayer.fabricObject;
            obj.set('fill', color);
            obj.setCoords();
            fabricCanvasRef.current?.renderAll();
            setProps(p => ({ ...p, fill: color }));
            dispatch({ type: 'UPDATE_LAYER', payload: { id: selectedLayer.id, fabricObject: obj } });
            dispatch({ type: 'SET_TOOL', payload: 'select' });
        };
        window.addEventListener('olo-lottie-eyedropper', handler);
        return () => window.removeEventListener('olo-lottie-eyedropper', handler);
    }, [selectedLayer, dispatch, fabricCanvasRef]);

    useEffect(() => {
        if (!selectedLayer?.fabricObject) { setProps({}); return; }
        setProps(getPropsFromObj(selectedLayer.fabricObject));
    }, [selectedLayer, state.currentFrame]);

    const updateProp = useCallback((key, value) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !selectedLayer?.fabricObject) return;
        const obj = selectedLayer.fabricObject;

        if (key === 'width') {
            const newScaleX = value / obj.width;
            obj.set('scaleX', newScaleX);
            if (lockScale) obj.set('scaleY', newScaleX);
        } else if (key === 'height') {
            const newScaleY = value / obj.height;
            obj.set('scaleY', newScaleY);
            if (lockScale) obj.set('scaleX', newScaleY);
        } else if (key === 'scaleXPct') {
            obj.set('scaleX', value / 100);
            if (lockScale) obj.set('scaleY', value / 100);
        } else if (key === 'scaleYPct') {
            obj.set('scaleY', value / 100);
            if (lockScale) obj.set('scaleX', value / 100);
        } else if (key === 'opacity') {
            obj.set('opacity', value / 100);
        } else {
            obj.set(key, value);
        }

        obj.setCoords();
        canvas.renderAll();
        setProps(getPropsFromObj(obj));
        dispatch({ type: 'UPDATE_LAYER', payload: { id: selectedLayer.id, fabricObject: obj } });
    }, [selectedLayer, lockScale, fabricCanvasRef, dispatch]);

    const addKeyframeForProp = useCallback((property) => {
        if (!selectedLayer?.fabricObject) return;
        const obj = selectedLayer.fabricObject;
        let value;
        switch (property) {
            case 'left': value = obj.left; break;
            case 'top': value = obj.top; break;
            case 'scaleX': value = obj.scaleX; break;
            case 'scaleY': value = obj.scaleY; break;
            case 'angle': value = obj.angle; break;
            case 'opacity': value = obj.opacity; break;
            case 'fill': value = obj.fill; break;
            default: return;
        }
        keyframeManager.addKeyframe(selectedLayer.id, property, state.currentFrame, value);
    }, [selectedLayer, keyframeManager, state.currentFrame]);

    if (!selectedLayer) {
        return (
            <div className="olo-lottie-properties">
                <div className="olo-lottie-panel__header"><span>Properties</span></div>
                <div className="olo-lottie-properties__empty">Select a layer to see its properties.</div>
                <div className="olo-lottie-prop-group">
                    <div className="olo-lottie-prop-group__title">Canvas</div>
                    <div className="olo-lottie-prop-row">
                        <label>W</label>
                        <input type="number" value={state.canvasWidth} onChange={e => dispatch({ type: 'SET_CANVAS_SIZE', payload: { width: parseInt(e.target.value) || 800, height: state.canvasHeight } })} />
                    </div>
                    <div className="olo-lottie-prop-row">
                        <label>H</label>
                        <input type="number" value={state.canvasHeight} onChange={e => dispatch({ type: 'SET_CANVAS_SIZE', payload: { width: state.canvasWidth, height: parseInt(e.target.value) || 600 } })} />
                    </div>
                    <div className="olo-lottie-prop-row">
                        <label>FPS</label>
                        <input type="number" value={state.fps} min={1} max={120} onChange={e => { const fps = Math.min(120, Math.max(1, parseInt(e.target.value) || 30)); dispatch({ type: 'SET_FPS', payload: fps }); keyframeManager.setFps(fps); }} />
                    </div>
                    <div className="olo-lottie-prop-row">
                        <label>Dur</label>
                        <input type="number" value={state.duration} min={0.5} max={60} step={0.5} onChange={e => { const dur = Math.min(60, Math.max(0.5, parseFloat(e.target.value) || 3)); dispatch({ type: 'SET_DURATION', payload: dur }); keyframeManager.setDuration(dur); }} />
                        <span className="olo-lottie-prop-unit">sec</span>
                    </div>
                </div>
            </div>
        );
    }

    const setOriginPoint = (ax, ay) => {
        dispatch({ type: 'SET_ANCHOR', payload: { id: selectedLayer.id, anchorX: ax, anchorY: ay } });
    };

    const objW = props.width || 100;
    const objH = props.height || 100;

    const kfBtnProps = { layerId: selectedLayer.id, currentFrame: state.currentFrame, keyframeManager, addKeyframeForProp };

    return (
        <div className="olo-lottie-properties">
            <div className="olo-lottie-panel__header"><span>Transform</span></div>

            <div className="olo-lottie-prop-group">
                <div className="olo-lottie-prop-row">
                    <label>X</label>
                    <input type="number" value={props.left ?? 0} onChange={e => updateProp('left', parseFloat(e.target.value))} />
                    <KfBtn property="left" {...kfBtnProps} />
                    <label style={{ marginLeft: 8 }}>Y</label>
                    <input type="number" value={props.top ?? 0} onChange={e => updateProp('top', parseFloat(e.target.value))} />
                    <KfBtn property="top" {...kfBtnProps} />
                </div>
            </div>

            <div className="olo-lottie-prop-group">
                <div className="olo-lottie-prop-row">
                    <label>{'\u2194'}</label>
                    <input type="number" value={props.scaleXPct ?? 100} onChange={e => updateProp('scaleXPct', parseFloat(e.target.value))} style={{ width: 55 }} />
                    <span className="olo-lottie-prop-unit">%</span>
                    <KfBtn property="scaleX" {...kfBtnProps} />
                    <button onClick={() => setLockScale(!lockScale)} title={lockScale ? 'Unlock proportions' : 'Lock proportions'} className="olo-lottie-scale-lock">
                        {lockScale ? '\u{1F517}' : '\u{1F513}'}
                    </button>
                    <label>{'\u2195'}</label>
                    <input type="number" value={props.scaleYPct ?? 100} onChange={e => updateProp('scaleYPct', parseFloat(e.target.value))} style={{ width: 55 }} />
                    <span className="olo-lottie-prop-unit">%</span>
                    <KfBtn property="scaleY" {...kfBtnProps} />
                </div>
            </div>

            <div className="olo-lottie-prop-group">
                <div className="olo-lottie-prop-row">
                    <label>R</label>
                    <input type="number" value={props.angle ?? 0} onChange={e => updateProp('angle', parseFloat(e.target.value))} style={{ width: 55 }} />
                    <span className="olo-lottie-prop-unit">{'\u00B0'}</span>
                    <KfBtn property="angle" {...kfBtnProps} />
                    <label style={{ marginLeft: 8 }}>Op</label>
                    <input type="number" value={props.opacity ?? 100} min={0} max={100} onChange={e => updateProp('opacity', parseInt(e.target.value))} style={{ width: 45 }} />
                    <span className="olo-lottie-prop-unit">%</span>
                    <KfBtn property="opacity" {...kfBtnProps} />
                </div>
            </div>

            <div className="olo-lottie-prop-group">
                <div className="olo-lottie-prop-group__title">Origin point</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <OriginPointGrid anchorX={selectedLayer.anchorX || 0} anchorY={selectedLayer.anchorY || 0} objWidth={objW} objHeight={objH} onSelect={setOriginPoint} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div className="olo-lottie-prop-row" style={{ marginBottom: 0 }}>
                            <label>X</label>
                            <input type="number" value={selectedLayer.anchorX || 0} onChange={e => dispatch({ type: 'SET_ANCHOR', payload: { id: selectedLayer.id, anchorX: parseFloat(e.target.value) || 0, anchorY: selectedLayer.anchorY || 0 } })} />
                        </div>
                        <div className="olo-lottie-prop-row" style={{ marginBottom: 0 }}>
                            <label>Y</label>
                            <input type="number" value={selectedLayer.anchorY || 0} onChange={e => dispatch({ type: 'SET_ANCHOR', payload: { id: selectedLayer.id, anchorX: selectedLayer.anchorX || 0, anchorY: parseFloat(e.target.value) || 0 } })} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="olo-lottie-prop-group">
                <div className="olo-lottie-prop-group__title">Hierarchy</div>
                <div className="olo-lottie-prop-row">
                    <label>Parent</label>
                    <select
                        value={selectedLayer.parentId || ''}
                        onChange={e => dispatch({ type: 'SET_PARENT', payload: { childId: selectedLayer.id, parentId: e.target.value || null } })}
                        className="olo-lottie-prop-select"
                    >
                        <option value="">None</option>
                        {state.layers
                            .filter(l => l.id !== selectedLayer.id && !isDescendant(state.layers, l.id, selectedLayer.id))
                            .map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                        }
                    </select>
                </div>
            </div>

            <div className="olo-lottie-prop-group">
                <div className="olo-lottie-prop-group__title">Appearance</div>
                <div className="olo-lottie-prop-row">
                    <label>Fill</label>
                    <input type="color" value={props.fill || '#000000'} onChange={e => updateProp('fill', e.target.value)} />
                    <input type="text" value={props.fill || ''} onChange={e => updateProp('fill', e.target.value)} style={{ flex: 1 }} />
                    <KfBtn property="fill" {...kfBtnProps} />
                </div>
                <div className="olo-lottie-prop-row">
                    <label>Str</label>
                    <input type="color" value={props.stroke || '#000000'} onChange={e => updateProp('stroke', e.target.value)} />
                    <input type="number" value={props.strokeWidth ?? 0} min={0} onChange={e => updateProp('strokeWidth', parseFloat(e.target.value))} style={{ width: '50px' }} />
                </div>
                {selectedLayer.type === 'rect' && (
                    <div className="olo-lottie-prop-row">
                        <label>Rx</label>
                        <input type="number" value={props.rx ?? 0} min={0} onChange={e => updateProp('rx', parseFloat(e.target.value))} />
                    </div>
                )}
            </div>
        </div>
    );
}
