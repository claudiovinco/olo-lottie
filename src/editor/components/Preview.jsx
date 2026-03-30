import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import lottie from 'lottie-web';
import { useEditor } from '../core/EditorContext';

export default function Preview() {
    const { generateLottie, state, keyframeManager } = useEditor();
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const panelRef = useRef(null);
    const [visible, setVisible] = useState(true);
    // Position is always {x, y} in parent-relative coords (left/top)
    const posRef = useRef(null); // mutable ref for drag perf
    const [, forceRender] = useState(0);
    const [size, setSize] = useState({ w: 280, h: 220 });
    const isDraggingRef = useRef(false);

    // Calculate initial bottom-right position in parent-relative left/top coords
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

    const refreshPreview = () => {
        if (!containerRef.current) return;

        if (animRef.current) {
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
    };

    // Subscribe to keyframe changes
    const [kfVersion, setKfVersion] = useState(0);
    useEffect(() => {
        return keyframeManager.subscribe(() => setKfVersion(n => n + 1));
    }, [keyframeManager]);

    // Refresh when layers change or keyframes change
    useEffect(() => {
        if (!visible) return;
        const timeout = setTimeout(refreshPreview, 300);
        return () => clearTimeout(timeout);
    }, [state.layers.length, kfVersion, visible]);

    // Cleanup lottie animation on unmount
    useEffect(() => {
        return () => {
            if (animRef.current) {
                animRef.current.destroy();
                animRef.current = null;
            }
        };
    }, []);

    // Drag: pure mouse-delta approach — no getBoundingClientRect, no coordinate conversion
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

    // Resize handler
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
                style={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    zIndex: 10,
                    background: '#313244',
                    color: '#cdd6f4',
                    border: '1px solid #45475a',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                }}
            >
                Show Preview
            </button>
        );
    }

    const pos = posRef.current;
    const panelStyle = {
        position: 'absolute',
        zIndex: 100,
        width: size.w,
        height: size.h,
        background: '#1e1e2e',
        border: '1px solid #45475a',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        // Always use left/top — never bottom/right
        left: pos ? pos.x : 'auto',
        top: pos ? pos.y : 'auto',
        // Temporary fallback before first layout calc
        ...(pos ? {} : { bottom: 16, right: 16 }),
    };

    return (
        <div ref={panelRef} style={panelStyle}>
            <div
                className="olo-lottie-preview-panel__header"
                onMouseDown={handleDragStart}
                style={{ cursor: 'move' }}
            >
                <span>Preview</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        onClick={refreshPreview}
                        style={{ background: 'none', border: 'none', color: '#6c7086', cursor: 'pointer', fontSize: 12 }}
                        title="Refresh"
                    >
                        ↻
                    </button>
                    <button
                        onClick={() => setVisible(false)}
                        style={{ background: 'none', border: 'none', color: '#6c7086', cursor: 'pointer', fontSize: 12 }}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
            </div>
            <div
                ref={containerRef}
                style={{ width: '100%', height: 'calc(100% - 30px)', background: '#ffffff' }}
            />
            {/* Resize handle */}
            <div
                onMouseDown={handleResizeStart}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 16,
                    height: 16,
                    cursor: 'nwse-resize',
                    background: 'linear-gradient(135deg, transparent 50%, #45475a 50%)',
                    borderRadius: '0 0 7px 0',
                }}
            />
        </div>
    );
}
