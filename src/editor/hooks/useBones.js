import { useEffect } from 'react';

export default function useBones({ bonesCanvasRef, bonesDrawRef, state }) {
    // Redraw bones overlay when state changes
    useEffect(() => {
        if (bonesDrawRef.current) bonesDrawRef.current();
    }, [state.layers, state.showBones, state.selectedLayerId, state.currentFrame]);

    // Sync bones canvas size with parent area (covers full visible region)
    useEffect(() => {
        if (bonesCanvasRef.current) {
            const parent = bonesCanvasRef.current.parentElement;
            if (parent) {
                const rect = parent.getBoundingClientRect();
                bonesCanvasRef.current.width = rect.width;
                bonesCanvasRef.current.height = rect.height;
            }
            if (bonesDrawRef.current) bonesDrawRef.current();
        }
    }, [state.canvasWidth, state.canvasHeight, state.zoom]);
}
