import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditor } from '../core/EditorContext';

const TRACK_HEIGHT = 28;
const RULER_HEIGHT = 24;
const FRAME_WIDTH = 8;

export default function Timeline() {
    const { state, dispatch, keyframeManager } = useEditor();
    const tracksRef = useRef(null);
    const rulerRef = useRef(null);
    const animFrameRef = useRef(null);
    const currentFrameRef = useRef(state.currentFrame);
    const [, forceUpdate] = useState(0);

    const totalFrames = Math.round(state.fps * state.duration);
    const totalFramesRef = useRef(totalFrames);
    const timelineWidth = totalFrames * FRAME_WIDTH;

    // Keep refs in sync
    useEffect(() => { currentFrameRef.current = state.currentFrame; }, [state.currentFrame]);
    useEffect(() => { totalFramesRef.current = totalFrames; }, [totalFrames]);

    // Subscribe to keyframe changes to re-render
    useEffect(() => {
        return keyframeManager.subscribe(() => forceUpdate(n => n + 1));
    }, [keyframeManager]);

    // Playback loop — only re-registers when isPlaying or fps changes
    useEffect(() => {
        if (!state.isPlaying) {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
            return;
        }

        let lastTime = performance.now();
        const frameDuration = 1000 / state.fps;

        const tick = (now) => {
            const delta = now - lastTime;
            if (delta >= frameDuration) {
                lastTime = now - (delta % frameDuration);
                const next = currentFrameRef.current + 1;
                if (next > totalFramesRef.current) {
                    dispatch({ type: 'SET_FRAME', payload: 0 });
                } else {
                    dispatch({ type: 'SET_FRAME', payload: next });
                }
            }
            animFrameRef.current = requestAnimationFrame(tick);
        };

        animFrameRef.current = requestAnimationFrame(tick);
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [state.isPlaying, state.fps, dispatch]);

    const handleRulerClick = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + (tracksRef.current?.scrollLeft || 0);
        const frame = Math.round(x / FRAME_WIDTH);
        dispatch({ type: 'SET_FRAME', payload: Math.max(0, Math.min(frame, totalFrames)) });
    }, [totalFrames, dispatch]);

    const handleTrackClick = useCallback((e, layerId, property) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frame = Math.round(x / FRAME_WIDTH);

        if (keyframeManager.hasKeyframeAt(layerId, property, frame)) {
            keyframeManager.removeKeyframe(layerId, property, frame);
        } else {
            // Get current value from the fabric object
            const layer = state.layers.find(l => l.id === layerId);
            if (!layer?.fabricObject) return;

            const obj = layer.fabricObject;
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

            keyframeManager.addKeyframe(layerId, property, frame, value);
        }

        dispatch({ type: 'SET_FRAME', payload: frame });
    }, [keyframeManager, state.layers, dispatch]);

    const formatTime = (frame) => {
        const seconds = frame / state.fps;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const frames = frame % state.fps;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
    };

    // Build track list: each layer has expandable properties
    const animatableProps = ['left', 'top', 'scaleX', 'scaleY', 'angle', 'opacity', 'fill'];
    const propLabels = {
        left: 'Position X',
        top: 'Position Y',
        scaleX: 'Scale X',
        scaleY: 'Scale Y',
        angle: 'Rotation',
        opacity: 'Opacity',
        fill: 'Fill Color',
    };

    return (
        <div className="olo-lottie-timeline">
            <div className="olo-lottie-timeline__controls">
                <button onClick={() => dispatch({ type: 'SET_FRAME', payload: 0 })} title="Go to start">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6,6H8V18H6V6M9.5,12L18,18V6L9.5,12Z" /></svg>
                </button>
                <button onClick={() => dispatch({ type: 'SET_FRAME', payload: Math.max(0, state.currentFrame - 1) })} title="Previous frame">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" /></svg>
                </button>
                <button
                    className={state.isPlaying ? 'playing' : ''}
                    onClick={() => dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying })}
                    title={state.isPlaying ? 'Pause' : 'Play'}
                >
                    {state.isPlaying ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14,19H18V5H14M6,19H10V5H6V19Z" /></svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
                    )}
                </button>
                <button onClick={() => dispatch({ type: 'SET_FRAME', payload: Math.min(totalFrames, state.currentFrame + 1) })} title="Next frame">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
                </button>
                <button onClick={() => dispatch({ type: 'SET_FRAME', payload: totalFrames })} title="Go to end">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16,18H18V6H16M6,18L14.5,12L6,6V18Z" /></svg>
                </button>
                <span className="olo-lottie-timeline__time">
                    {formatTime(state.currentFrame)} / {formatTime(totalFrames)}
                </span>
                <span style={{ fontSize: '11px', color: '#6c7086' }}>
                    Frame {state.currentFrame}
                </span>
            </div>

            <div className="olo-lottie-timeline__content">
                <div className="olo-lottie-timeline__labels">
                    <div style={{ height: RULER_HEIGHT, borderBottom: '1px solid #313244' }} />
                    {state.layers.map(layer => (
                        <React.Fragment key={layer.id}>
                            <div
                                className="olo-lottie-timeline__label"
                                style={{
                                    fontWeight: state.selectedLayerId === layer.id ? 600 : 400,
                                    color: state.selectedLayerId === layer.id ? '#cdd6f4' : '#a6adc8',
                                }}
                                onClick={() => dispatch({ type: 'SELECT_LAYER', payload: layer.id })}
                            >
                                <span style={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: 2,
                                    background: layer.color || '#89b4fa',
                                    marginRight: 6,
                                }} />
                                {layer.name}
                            </div>
                            {state.selectedLayerId === layer.id && animatableProps.map(prop => {
                                const kfs = keyframeManager.getKeyframes(layer.id, prop);
                                if (kfs.length === 0) return null;
                                return (
                                    <div
                                        key={prop}
                                        className="olo-lottie-timeline__label"
                                        style={{ paddingLeft: 24, fontSize: '10px', color: '#6c7086' }}
                                    >
                                        {propLabels[prop]}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>

                <div className="olo-lottie-timeline__tracks" ref={tracksRef}>
                    {/* Ruler */}
                    <div
                        className="olo-lottie-timeline__ruler"
                        ref={rulerRef}
                        style={{ width: timelineWidth }}
                        onClick={handleRulerClick}
                    >
                        <RulerCanvas width={timelineWidth} height={RULER_HEIGHT} fps={state.fps} totalFrames={totalFrames} />
                    </div>

                    {/* Tracks */}
                    {state.layers.map(layer => (
                        <React.Fragment key={layer.id}>
                            <div
                                className="olo-lottie-timeline__track"
                                style={{ width: timelineWidth }}
                                onDoubleClick={(e) => handleTrackClick(e, layer.id, 'left')}
                            >
                                {/* Show all keyframes for this layer */}
                                {animatableProps.map(prop =>
                                    keyframeManager.getKeyframes(layer.id, prop).map(kf => (
                                        <div
                                            key={`${prop}-${kf.frame}`}
                                            className={`olo-lottie-keyframe ${state.currentFrame === kf.frame ? 'olo-lottie-keyframe--selected' : ''}`}
                                            style={{ left: kf.frame * FRAME_WIDTH }}
                                            title={`${propLabels[prop]}: ${typeof kf.value === 'number' ? kf.value.toFixed(1) : kf.value} @ frame ${kf.frame}`}
                                        />
                                    ))
                                )}
                            </div>
                            {/* Expanded property tracks */}
                            {state.selectedLayerId === layer.id && animatableProps.map(prop => {
                                const kfs = keyframeManager.getKeyframes(layer.id, prop);
                                if (kfs.length === 0) return null;
                                return (
                                    <div
                                        key={prop}
                                        className="olo-lottie-timeline__track"
                                        style={{ width: timelineWidth, background: 'rgba(69, 71, 90, 0.15)' }}
                                        onDoubleClick={(e) => handleTrackClick(e, layer.id, prop)}
                                    >
                                        {kfs.map(kf => (
                                            <div
                                                key={kf.frame}
                                                className={`olo-lottie-keyframe ${state.currentFrame === kf.frame ? 'olo-lottie-keyframe--selected' : ''}`}
                                                style={{ left: kf.frame * FRAME_WIDTH }}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}

                    {/* Playhead */}
                    <div
                        className="olo-lottie-timeline__playhead"
                        style={{ left: state.currentFrame * FRAME_WIDTH }}
                    />
                </div>
            </div>
        </div>
    );
}

function RulerCanvas({ width, height, fps, totalFrames }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#6c7086';
        ctx.font = '10px monospace';

        for (let i = 0; i <= totalFrames; i++) {
            const x = i * FRAME_WIDTH;

            if (i % fps === 0) {
                // Second marker
                ctx.fillStyle = '#a6adc8';
                ctx.fillRect(x, height - 12, 1, 12);
                ctx.fillText(`${i / fps}s`, x + 3, 10);
            } else if (i % (fps / 2) === 0) {
                // Half-second marker
                ctx.fillStyle = '#45475a';
                ctx.fillRect(x, height - 8, 1, 8);
            } else if (i % 5 === 0) {
                ctx.fillStyle = '#313244';
                ctx.fillRect(x, height - 5, 1, 5);
            }
        }
    }, [width, height, fps, totalFrames]);

    return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} />;
}
