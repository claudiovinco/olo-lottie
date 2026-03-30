import React, { useState, useCallback, useMemo } from 'react';
import { useEditor } from '../core/EditorContext';

function buildLayerTree(layers) {
    const childrenMap = {};
    const roots = [];
    layers.forEach(l => {
        if (!l.parentId) {
            roots.push(l);
        } else {
            if (!childrenMap[l.parentId]) childrenMap[l.parentId] = [];
            childrenMap[l.parentId].push(l);
        }
    });
    return { roots: roots.reverse(), childrenMap };
}

const LayerItem = React.memo(function LayerItem({ layer, depth, childrenMap, selectedLayerId, dispatch, fabricCanvasRef, keyframeManager, handleSelect, handleDelete, handleRename, dragState, setDragState }) {
    const children = (childrenMap[layer.id] || []).slice().reverse();
    const isSelected = selectedLayerId === layer.id;
    const isDragOver = dragState.overId === layer.id;

    const onDragStart = useCallback((e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', layer.id);
        setDragState(s => ({ ...s, dragId: layer.id }));
    }, [layer.id, setDragState]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState(s => ({ ...s, overId: layer.id }));
    }, [layer.id, setDragState]);

    const onDragLeave = useCallback((e) => {
        e.stopPropagation();
        setDragState(s => s.overId === layer.id ? { ...s, overId: null } : s);
    }, [layer.id, setDragState]);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const childId = e.dataTransfer.getData('text/plain');
        if (childId && childId !== layer.id) {
            dispatch({ type: 'SET_PARENT', payload: { childId, parentId: layer.id } });
        }
        setDragState({ dragId: null, overId: null });
    }, [layer.id, dispatch, setDragState]);

    return (
        <>
            <div
                className={`olo-lottie-layer ${isSelected ? 'olo-lottie-layer--selected' : ''}`}
                style={{
                    paddingLeft: 8 + depth * 16,
                    borderLeft: isDragOver ? '2px solid var(--olo-accent-blue, #89b4fa)' : '2px solid transparent',
                }}
                onClick={() => handleSelect(layer.id)}
                draggable
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                {depth > 0 && (
                    <span className="olo-lottie-layer__indent">{'\u2514'}</span>
                )}
                <div className="olo-lottie-layer__color" style={{ background: layer.color || '#89b4fa' }} />
                <span
                    className="olo-lottie-layer__name"
                    onDoubleClick={(e) => {
                        const el = e.target;
                        el.contentEditable = true;
                        el.focus();
                        const range = document.createRange();
                        range.selectNodeContents(el);
                        window.getSelection().removeAllRanges();
                        window.getSelection().addRange(range);
                        const finish = () => {
                            el.contentEditable = false;
                            handleRename(layer.id, el.textContent.trim() || layer.name);
                        };
                        el.onblur = finish;
                        el.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); finish(); } };
                    }}
                >
                    {layer.name}
                </span>
                <div className="olo-lottie-layer__actions">
                    <button
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: layer.id }); }}
                        title={layer.visible !== false ? 'Hide' : 'Show'}
                        style={{ opacity: layer.visible !== false ? 1 : 0.4 }}
                    >
                        {layer.visible !== false ? '\u{1F441}' : '\u{1F6AB}'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_LAYER_LOCK', payload: layer.id }); }}
                        title={layer.locked ? 'Unlock' : 'Lock'}
                    >
                        {layer.locked ? '\u{1F512}' : '\u{1F513}'}
                    </button>
                    {layer.parentId && (
                        <button
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_PARENT', payload: { childId: layer.id, parentId: null } }); }}
                            title="Unparent"
                            className="olo-lottie-layer__unparent"
                        >
                            {'\u2197'}
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(layer.id); }}
                        title="Delete"
                        className="olo-lottie-layer__delete"
                    >
                        {'\u2715'}
                    </button>
                </div>
            </div>
            {children.map(child => (
                <LayerItem
                    key={child.id}
                    layer={child}
                    depth={depth + 1}
                    childrenMap={childrenMap}
                    selectedLayerId={selectedLayerId}
                    dispatch={dispatch}
                    fabricCanvasRef={fabricCanvasRef}
                    keyframeManager={keyframeManager}
                    handleSelect={handleSelect}
                    handleDelete={handleDelete}
                    handleRename={handleRename}
                    dragState={dragState}
                    setDragState={setDragState}
                />
            ))}
        </>
    );
}, (prev, next) => {
    return prev.layer === next.layer
        && prev.depth === next.depth
        && prev.childrenMap === next.childrenMap
        && prev.selectedLayerId === next.selectedLayerId
        && prev.dragState === next.dragState;
});

export default function LayerPanel() {
    const { state, dispatch, fabricCanvasRef, keyframeManager } = useEditor();
    const [dragState, setDragState] = useState({ dragId: null, overId: null });

    const handleSelect = useCallback((layerId) => {
        dispatch({ type: 'SELECT_LAYER', payload: layerId });
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const layer = state.layers.find(l => l.id === layerId);
        if (layer?.fabricObject) {
            canvas.setActiveObject(layer.fabricObject);
            canvas.renderAll();
        }
    }, [state.layers, dispatch, fabricCanvasRef]);

    const handleDelete = useCallback((layerId) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const layer = state.layers.find(l => l.id === layerId);
        if (layer?.fabricObject) {
            canvas.remove(layer.fabricObject);
            canvas.renderAll();
        }
        dispatch({ type: 'REMOVE_LAYER', payload: layerId });
        keyframeManager.removeAllKeyframes(layerId);
    }, [state.layers, dispatch, fabricCanvasRef, keyframeManager]);

    const handleRename = useCallback((layerId, name) => {
        dispatch({ type: 'UPDATE_LAYER', payload: { id: layerId, name } });
    }, [dispatch]);

    const { roots, childrenMap } = useMemo(() => buildLayerTree(state.layers), [state.layers]);

    const onPanelDragOver = useCallback((e) => {
        e.preventDefault();
        setDragState(s => ({ ...s, overId: '__root__' }));
    }, []);

    const onPanelDrop = useCallback((e) => {
        e.preventDefault();
        const childId = e.dataTransfer.getData('text/plain');
        if (childId) {
            dispatch({ type: 'SET_PARENT', payload: { childId, parentId: null } });
        }
        setDragState({ dragId: null, overId: null });
    }, [dispatch]);

    return (
        <div className="olo-lottie-layers">
            <div className="olo-lottie-panel__header"><span>Layers</span></div>
            <div className="olo-lottie-layers__list" onDragOver={onPanelDragOver} onDrop={onPanelDrop}>
                {state.layers.length === 0 && (
                    <div className="olo-lottie-layers__empty">
                        No layers yet.<br />Use the toolbar to add shapes.
                    </div>
                )}
                {roots.map(layer => (
                    <LayerItem
                        key={layer.id}
                        layer={layer}
                        depth={0}
                        childrenMap={childrenMap}
                        selectedLayerId={state.selectedLayerId}
                        dispatch={dispatch}
                        fabricCanvasRef={fabricCanvasRef}
                        keyframeManager={keyframeManager}
                        handleSelect={handleSelect}
                        handleDelete={handleDelete}
                        handleRename={handleRename}
                        dragState={dragState}
                        setDragState={setDragState}
                    />
                ))}
            </div>
        </div>
    );
}
