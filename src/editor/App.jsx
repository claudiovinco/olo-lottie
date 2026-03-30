import React, { useEffect, useState } from 'react';
import { EditorProvider } from './core/EditorContext';
import ErrorBoundary from './components/ErrorBoundary';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import LayerPanel from './components/LayerPanel';
import CanvasEditor from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import Timeline from './components/Timeline';
import Preview from './components/Preview';
import { useEditor } from './core/EditorContext';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

function EditorLoader() {
    const { dispatch, keyframeManager } = useEditor();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const animationId = window.oloLottie?.animationId;
        if (!animationId || loaded) return;

        const load = async () => {
            try {
                const res = await fetch(
                    `${window.oloLottie.restUrl}animations/${animationId}`,
                    { headers: { 'X-WP-Nonce': window.oloLottie.nonce } }
                );
                if (!res.ok) return;
                const data = await res.json();

                dispatch({
                    type: 'LOAD_STATE',
                    payload: {
                        title: data.title || 'Untitled Animation',
                        canvasWidth: data.width || 800,
                        canvasHeight: data.height || 600,
                        fps: data.fps || 30,
                        duration: data.duration || 3,
                    },
                });

                if (data.editor_state?.keyframes) {
                    keyframeManager.fromJSON(data.editor_state.keyframes);
                }

                if (data.editor_state?.layers) {
                    window._oloLottieLoadLayers = data.editor_state.layers;
                    window.dispatchEvent(new CustomEvent('olo-lottie-load-layers'));
                }

                setLoaded(true);
            } catch (e) {
                console.error('Failed to load animation:', e);
            }
        };

        const timeout = setTimeout(load, 200);
        return () => clearTimeout(timeout);
    }, [loaded]);

    return null;
}

function KeyboardShortcutsBridge() {
    const { state, dispatch, keyframeManager, fabricCanvasRef } = useEditor();

    useKeyboardShortcuts({
        dispatch,
        keyframeManager,
        fabricCanvasRef,
        state,
        onSave: () => window._oloLottieSave?.(),
        onUndo: () => {}, // TODO: integrate with UndoManager
        onRedo: () => {},
    });

    return null;
}

export default function App() {
    return (
        <ErrorBoundary>
            <EditorProvider>
                <EditorLoader />
                <KeyboardShortcutsBridge />
                <TopBar />
                <div className="olo-lottie-main">
                    <Toolbar />
                    <LayerPanel />
                    <div className="olo-lottie-canvas-area" style={{ position: 'relative' }}>
                        <CanvasEditor />
                        <Preview />
                    </div>
                    <PropertyPanel />
                </div>
                <Timeline />
            </EditorProvider>
        </ErrorBoundary>
    );
}
