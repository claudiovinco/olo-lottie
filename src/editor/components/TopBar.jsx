import React, { useState, useEffect, useCallback } from 'react';
import { useEditor } from '../core/EditorContext';
import { serializeLayers } from '../utils/serialization';

export default React.memo(function TopBar() {
    const { state, dispatch, generateLottie, keyframeManager } = useEditor();
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = useCallback((type, message) => {
        setToast({ type, message });
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const lottieJson = generateLottie();
            const body = {
                title: state.title,
                lottie_json: lottieJson,
                editor_state: {
                    layers: serializeLayers(state.layers),
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
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.oloLottie.nonce },
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
    }, [state, generateLottie, keyframeManager, showToast]);

    // Expose save for keyboard shortcuts
    useEffect(() => {
        window._oloLottieSave = handleSave;
        return () => { delete window._oloLottieSave; };
    }, [handleSave]);

    const handleExport = useCallback(() => {
        const lottieJson = generateLottie();
        const blob = new Blob([JSON.stringify(lottieJson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').toLowerCase() || 'animation'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [state.title, generateLottie]);

    return (
        <div className="olo-lottie-topbar">
            <div className="olo-lottie-topbar__title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--olo-accent-blue, #89b4fa)">
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
                <button className="olo-lottie-btn olo-lottie-btn--secondary" onClick={handleExport}>
                    Export JSON
                </button>
                <button className="olo-lottie-btn olo-lottie-btn--primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {toast && (
                <div className={`olo-lottie-toast olo-lottie-toast--${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
});
