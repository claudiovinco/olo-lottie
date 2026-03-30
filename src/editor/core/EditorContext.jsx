import React, { createContext, useContext, useReducer, useRef, useCallback, useMemo, useEffect } from 'react';
import { KeyframeManager } from './KeyframeManager';
import { LottieGenerator } from './LottieGenerator';

const EditorContext = createContext(null);

const initialState = {
    title: 'Untitled Animation',
    canvasWidth: 800,
    canvasHeight: 600,
    fps: 30,
    duration: 3,
    layers: [],
    selectedLayerId: null,
    activeTool: 'select',
    currentFrame: 0,
    isPlaying: false,
    zoom: 1,
    showBones: true,
};

export function isDescendant(layers, layerId, potentialAncestorId) {
    let current = layerId;
    const layerMap = new Map(layers.map(l => [l.id, l]));
    while (current) {
        const layer = layerMap.get(current);
        if (!layer || !layer.parentId) return false;
        if (layer.parentId === potentialAncestorId) return true;
        current = layer.parentId;
    }
    return false;
}

function editorReducer(state, action) {
    switch (action.type) {
        case 'SET_TITLE':
            return { ...state, title: action.payload };
        case 'SET_CANVAS_SIZE':
            return { ...state, canvasWidth: action.payload.width, canvasHeight: action.payload.height };
        case 'SET_FPS':
            return { ...state, fps: action.payload };
        case 'SET_DURATION':
            return { ...state, duration: action.payload };
        case 'ADD_LAYER': {
            const newLayer = { parentId: null, anchorX: 0, anchorY: 0, ...action.payload };
            return { ...state, layers: [...state.layers, newLayer], selectedLayerId: newLayer.id };
        }
        case 'REMOVE_LAYER': {
            const removedId = action.payload;
            return {
                ...state,
                layers: state.layers
                    .filter(l => l.id !== removedId)
                    .map(l => l.parentId === removedId ? { ...l, parentId: null } : l),
                selectedLayerId: state.selectedLayerId === removedId ? null : state.selectedLayerId,
            };
        }
        case 'UPDATE_LAYER':
            return { ...state, layers: state.layers.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l) };
        case 'SELECT_LAYER':
            return { ...state, selectedLayerId: action.payload };
        case 'REORDER_LAYERS':
            return { ...state, layers: action.payload };
        case 'SET_TOOL':
            return { ...state, activeTool: action.payload };
        case 'SET_FRAME':
            return { ...state, currentFrame: action.payload };
        case 'SET_PLAYING':
            return { ...state, isPlaying: action.payload };
        case 'SET_ZOOM':
            return { ...state, zoom: action.payload };
        case 'TOGGLE_LAYER_VISIBILITY':
            return { ...state, layers: state.layers.map(l => l.id === action.payload ? { ...l, visible: !l.visible } : l) };
        case 'TOGGLE_LAYER_LOCK':
            return { ...state, layers: state.layers.map(l => l.id === action.payload ? { ...l, locked: !l.locked } : l) };
        case 'SET_PARENT': {
            const { childId, parentId } = action.payload;
            let current = parentId;
            while (current) {
                if (current === childId) return state;
                const parentLayer = state.layers.find(l => l.id === current);
                current = parentLayer?.parentId || null;
            }
            return { ...state, layers: state.layers.map(l => l.id === childId ? { ...l, parentId: parentId || null } : l) };
        }
        case 'SET_ANCHOR':
            return { ...state, layers: state.layers.map(l => l.id === action.payload.id ? { ...l, anchorX: action.payload.anchorX, anchorY: action.payload.anchorY } : l) };
        case 'TOGGLE_BONES':
            return { ...state, showBones: !state.showBones };
        case 'LOAD_STATE':
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

export function EditorProvider({ children }) {
    const [state, dispatch] = useReducer(editorReducer, initialState);
    const keyframeManagerRef = useRef(new KeyframeManager(initialState.fps, initialState.duration));
    const lottieGeneratorRef = useRef(new LottieGenerator(keyframeManagerRef.current));
    const fabricCanvasRef = useRef(null);
    const undoManagerRef = useRef(null);

    // Lazy init UndoManager
    useEffect(() => {
        import('./UndoManager').then(({ UndoManager }) => {
            undoManagerRef.current = new UndoManager(50);
        });
    }, []);

    const generateLottie = useCallback(() => {
        return lottieGeneratorRef.current.generate(state.layers, state.canvasWidth, state.canvasHeight);
    }, [state.layers, state.canvasWidth, state.canvasHeight]);

    const value = useMemo(() => ({
        state,
        dispatch,
        keyframeManager: keyframeManagerRef.current,
        lottieGenerator: lottieGeneratorRef.current,
        fabricCanvasRef,
        generateLottie,
        undoManager: undoManagerRef.current,
    }), [state, generateLottie]);

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
}

export function useEditor() {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error('useEditor must be used within EditorProvider');
    return ctx;
}
