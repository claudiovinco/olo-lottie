import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import lottie from 'lottie-web';
import { useEditor } from '../core/EditorContext';

export default function Preview() {
    const { generateLottie, state, keyframeManager } = useEditor();
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const panelRef = useRef(null);
    const [visible, setVisible] = useState(true);
    const posRef = useRef(null);
    const [, forceRender] = useState(0);
    const [size, setSize] = useState({ w: 280, h: 220 });
    const isDraggingRef = useRef(false);

    useLayoutEffect(() => {
        if (!visible || posRef.current !== null) return;
        const panel = panelRef.current;
        if (!panel) return;
        const parent = panel.parentElement;
        if (!parent) return;
        posRef.current = {
            x: parent.clientWidth - size.w - 16,
            y: parent.clientHeight - size.h - 16,
        };
        forceRender(n => n + 1);
    }, [visible]);

    const refreshPreview = useCallback(() => {
        if (!containerRef.current) return;

        if (animRef.current) {
            animRef.current.pause();
            animRef.current.destroy();
            animRef.current = null;
        }

        try {
            const lottieData = generateLottie();
            if (!lottieData || !lottieData.layers || lottieData.layers.length === 0) return;

            animRef.current = lottie.loadAnimation({
                container: containerRef.current,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: lottieData,
            });
        } catch (e) {
            console.warn('Preview error:', e);
        }
    }, [generateLottie]);

    // Subscribe to keyframe changes
    const [kfVersion, setKfVersion] = useState(0);
    useEffect(() => {
        return keyframeManager.subscribe(() => setKfVersion(n => n + 1));
    }, [keyframeManager]);

    // Refresh when layers change (reference changes on any update) or keyframes change
    useEffect(() => {
        if (!visible) return;
        const timeout = setTimeout(refreshPreview, 300);
        return () => clearTimeout(timeout);
    }, [state.layers, state.canvasWidth, state.canvasHeight, kfVersion, visible, refreshPreview]);

    useEffect(() => {
        return () => {
            if (animRef.current) {
                animRef.current.pause();
                animRef.current.destroy();
                animRef.current = null;
            }
        };
    }, []);

    const handleDragStart = useCallback((e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button')) return;
        e.preventDefault();

        const startPos = posRef.current;
        if (!startPos) return;

        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startX = startPos.x;
        const startY = startPos.y;
        isDraggingRef.current = true;

        const onMove = (ev) => {
            if (!isDraggingRef.current) return;
            posRef.current = {
                x: startX + (ev.clientX - startMouseX),
                y: startY + (ev.clientY - startMouseY),
            };
            forceRender(n => n + 1);
        };

        const onUp = () => {
            isDraggingRef.current = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    const handleResizeStart = useCallback((e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = size.w;
        const startH = size.h;
        let isResizing = true;

        const onMove = (ev) => {
            if (!isResizing) return;
            setSize({
                w: Math.max(180, startW + (ev.clientX - startX)),
                h: Math.max(140, startH + (ev.clientY - startY)),
            });
        };

        const onUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [size]);

    if (!visible) {
        return (
            <button
                onClick={() => { posRef.current = null; setVisible(true); }}
                className="olo-lottie-preview-toggle"
            >
                Show Preview
            </button>
        );
    }

    const pos = posRef.current;
    const panelStyle = {
        position: 'absolute', zIndex: 100,
        width: size.w, height: size.h,
        left: pos ? pos.x : 'auto',
        top: pos ? pos.y : 'auto',
        ...(pos ? {} : { bottom: 16, right: 16 }),
    };

    return (
        <div ref={panelRef} className="olo-lottie-preview-panel" style={panelStyle}>
            <div className="olo-lottie-preview-panel__header" onMouseDown={handleDragStart} style={{ cursor: 'move' }}>
                <span>Preview</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={refreshPreview} title="Refresh" className="olo-lottie-preview-btn">{'\u21BB'}</button>
                    <button onClick={() => setVisible(false)} title="Close" className="olo-lottie-preview-btn">{'\u2715'}</button>
                </div>
            </div>
            <div ref={containerRef} className="olo-lottie-preview-panel__content" />
            <div onMouseDown={handleResizeStart} className="olo-lottie-preview-panel__resize" />
        </div>
    );
}
