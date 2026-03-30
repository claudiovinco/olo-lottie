import React, { useState } from 'react';
import { useEditor } from '../core/EditorContext';

export default function TopBar() {
    const { state, dispatch, generateLottie, keyframeManager } = useEditor();
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    // Serialize layer properties (without fabricObject which is not serializable)
    const serializeLayers = () => {
        return state.layers.map(l => {
            const obj = l.fabricObject;
            const base = {
                id: l.id,
                name: l.name,
                type: l.type,
                visible: l.visible,
                locked: l.locked,
                color: l.color,
                parentId: l.parentId || null,
                anchorX: l.anchorX || 0,
                anchorY: l.anchorY || 0,
            };

            if (!obj) return base;

            // Save all shape properties needed to reconstruct on Fabric canvas
            base.props = {
                left: obj.left,
                top: obj.top,
                width: obj.width,
                height: obj.height,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                angle: obj.angle,
                opacity: obj.opacity,
                fill: obj.fill,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth,
                rx: obj.rx || 0,
                ry: obj.ry || 0,
                radius: obj.radius || 0,
                flipX: obj.flipX,
                flipY: obj.flipY,
                originX: obj.originX,
                originY: obj.originY,
            };

            // Type-specific data
            if (l.type === 'text' || obj.type === 'i-text') {
                base.props.text = obj.text;
                base.props.fontSize = obj.fontSize;
                base.props.fontFamily = obj.fontFamily;
                base.props.fontWeight = obj.fontWeight;
                base.props.fontStyle = obj.fontStyle;
                base.props.textAlign = obj.textAlign;
            }

            if (obj.path) {
                // Fabric Path: serialize path data
                base.props.pathData = obj.path.map(cmd => [...cmd]);
            }

            if (obj.points) {
                // Polygon/Star/Triangle: serialize points
                base.props.points = obj.points.map(p => ({ x: p.x, y: p.y }));
            }

            if (obj.type === 'line') {
                base.props.x1 = obj.x1;
                base.props.y1 = obj.y1;
                base.props.x2 = obj.x2;
                base.props.y2 = obj.y2;
            }

            return base;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const lottieJson = generateLottie();
            const body = {
                title: state.title,
                lottie_json: lottieJson,
                editor_state: {
                    layers: serializeLayers(),
                    keyframes: keyframeManager.toJSON(),
                },
                width: state.canvasWidth,
                height: state.canvasHeight,
                fps: state.fps,
                duration: state.duration,
            };

            const animationId = window.oloLottie?.animationId;
            const url = animationId
                ? `${window.oloLottie.restUrl}animations/${animationId}`
                : `${window.oloLottie.restUrl}animations`;
            const method = animationId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.oloLottie.nonce,
                },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const data = await res.json();
                if (!animationId && data.id) {
                    const newUrl = new URL(window.location);
                    newUrl.searchParams.set('id', data.id);
                    window.history.replaceState(null, '', newUrl);
                    window.oloLottie.animationId = data.id;
                }
                showToast('success', 'Animazione salvata!');
            } else {
                const errText = await res.text();
                console.error('Save response error:', res.status, errText);
                showToast('error', `Errore nel salvataggio (${res.status})`);
            }
        } catch (e) {
            console.error('Save failed:', e);
            showToast('error', 'Errore di rete nel salvataggio');
        }
        setSaving(false);
    };

    const handleExport = () => {
        const lottieJson = generateLottie();
        const blob = new Blob([JSON.stringify(lottieJson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.title.replace(/\s+/g, '_').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="olo-lottie-topbar">
            <div className="olo-lottie-topbar__title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#89b4fa">
                    <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" />
                    <path d="M12,6a6,6,0,1,0,6,6A6,6,0,0,0,12,6Zm0,10a4,4,0,1,1,4-4A4,4,0,0,1,12,16Z" opacity="0.6" />
                </svg>
                <input
                    type="text"
                    value={state.title}
                    onChange={e => dispatch({ type: 'SET_TITLE', payload: e.target.value })}
                />
            </div>

            <div className="olo-lottie-topbar__actions">
                <button
                    className="olo-lottie-btn olo-lottie-btn--secondary"
                    onClick={handleExport}
                >
                    Export JSON
                </button>
                <button
                    className="olo-lottie-btn olo-lottie-btn--primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Toast notification */}
            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        top: 16,
                        right: 16,
                        zIndex: 10000,
                        padding: '10px 20px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        background: toast.type === 'success' ? '#a6e3a1' : '#f38ba8',
                        color: '#1e1e2e',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        animation: 'olo-toast-in 0.3s ease',
                    }}
                >
                    {toast.message}
                </div>
            )}
        </div>
    );
}
