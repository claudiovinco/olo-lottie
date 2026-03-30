import React, { useState, useCallback } from 'react';
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

function LayerItem({ layer, depth, childrenMap, state, dispatch, fabricCanvasRef, keyframeManager, handleSelect, handleDelete, handleRename, dragState, setDragState }) {
    const children = (childrenMap[layer.id] || []).slice().reverse();
    const isSelected = state.selectedLayerId === layer.id;
    const isDragOver = dragState.overId === layer.id;

    const onDragStart = useCallback((e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', layer.id);
        setDragState(s => ({ ...s, dragId: layer.id }));
    }, [layer.id]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState(s => ({ ...s, overId: layer.id }));
    }, [layer.id]);

    const onDragLeave = useCallback((e) => {
        e.stopPropagation();
        setDragState(s => s.overId === layer.id ? { ...s, overId: null } : s);
    }, [layer.id]);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const childId = e.dataTransfer.getData('text/plain');
        if (childId && childId !== layer.id) {
            dispatch({ type: 'SET_PARENT', payload: { childId, parentId: layer.id } });
        }
        setDragState({ dragId: null, overId: null });
    }, [layer.id, dispatch]);

    return (
        <>
            <div
                className={`olo-lottie-layer ${isSelected ? 'olo-lottie-layer--selected' : ''}`}
                style={{
                    paddingLeft: 8 + depth * 16,
                    borderLeft: isDragOver ? '2px solid #89b4fa' : '2px solid transparent',
                }}
                onClick={() => handleSelect(layer.id)}
                draggable
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                {depth > 0 && (
                    <span style={{ color: '#45475a', fontSize: 10, marginRight: 4 }}>&#x2514;</span>
                )}
                <div
                    className="olo-lottie-layer__color"
                    style={{ background: layer.color || '#89b4fa' }}
                />
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
                        el.onkeydown = (ev) => {
                            if (ev.key === 'Enter') {
                                ev.preventDefault();
                                finish();
                            }
                        };
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
                            style={{ color: '#fab387', fontSize: 10 }}
                        >
                            {'\u2197'}
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(layer.id); }}
                        title="Delete"
                        style={{ color: '#f38ba8' }}
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
                    state={state}
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
}

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

    const { roots, childrenMap } = buildLayerTree(state.layers);

    // Drop on the panel background = unparent (drop to root)
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
            <div className="olo-lottie-panel__header">
                <span>Layers</span>
            </div>
            <div
                className="olo-lottie-layers__list"
                onDragOver={onPanelDragOver}
                onDrop={onPanelDrop}
            >
                {state.layers.length === 0 && (
                    <div style={{ padding: '16px 12px', color: '#6c7086', fontSize: '12px', textAlign: 'center' }}>
                        No layers yet.<br />Use the toolbar to add shapes.
                    </div>
                )}
                {roots.map(layer => (
                    <LayerItem
                        key={layer.id}
                        layer={layer}
                        depth={0}
                        childrenMap={childrenMap}
                        state={state}
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
