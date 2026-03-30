import React, { useState, useEffect, useRef } from 'react';
import lottie from 'lottie-web';

export default function AnimationList() {
    const [animations, setAnimations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAnimations = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${window.oloLottie.restUrl}animations`, {
                headers: { 'X-WP-Nonce': window.oloLottie.nonce },
            });
            if (!res.ok) throw new Error('Errore nel caricamento');
            const data = await res.json();
            setAnimations(data);
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    useEffect(() => { fetchAnimations(); }, []);

    const handleDelete = async (id, title) => {
        if (!confirm(`Eliminare "${title}"?`)) return;
        try {
            await fetch(`${window.oloLottie.restUrl}animations/${id}`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': window.oloLottie.nonce },
            });
            setAnimations(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            alert('Errore durante l\'eliminazione');
        }
    };

    const editorUrl = (id) => {
        const base = window.location.href.split('?')[0];
        return `${base}?page=olo-lottie-editor&id=${id}`;
    };

    const newUrl = () => {
        const base = window.location.href.split('?')[0];
        return `${base}?page=olo-lottie-editor`;
    };

    return (
        <div style={{ padding: '20px 20px 20px 0', maxWidth: 1200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ margin: 0, fontSize: 23, fontWeight: 400 }}>Lottie Animations</h1>
                <a
                    href={newUrl()}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 16px', background: '#2271b1', color: '#fff',
                        border: 'none', borderRadius: 4, textDecoration: 'none',
                        fontSize: 13, cursor: 'pointer',
                    }}
                >
                    + New Animation
                </a>
            </div>

            {loading && <p>Caricamento...</p>}
            {error && <p style={{ color: '#d63638' }}>{error}</p>}

            {!loading && animations.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: '#f0f0f1', borderRadius: 8, color: '#50575e',
                }}>
                    <p style={{ fontSize: 16, marginBottom: 12 }}>Nessuna animazione trovata.</p>
                    <a
                        href={newUrl()}
                        style={{ color: '#2271b1', textDecoration: 'none', fontWeight: 500 }}
                    >
                        Crea la tua prima animazione
                    </a>
                </div>
            )}

            {!loading && animations.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))',
                    gap: 16,
                }}>
                    {animations.map(anim => (
                        <AnimationCard
                            key={anim.id}
                            animation={anim}
                            editorUrl={editorUrl(anim.id)}
                            onDelete={() => handleDelete(anim.id, anim.title)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function AnimationCard({ animation, editorUrl, onDelete }) {
    const previewRef = useRef(null);
    const animInstanceRef = useRef(null);

    useEffect(() => {
        if (!previewRef.current || !animation.lottie_json) return;

        try {
            animInstanceRef.current = lottie.loadAnimation({
                container: previewRef.current,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animation.lottie_json,
            });
        } catch (e) {
            // silently ignore preview errors
        }

        return () => {
            if (animInstanceRef.current) {
                animInstanceRef.current.destroy();
                animInstanceRef.current = null;
            }
        };
    }, [animation.lottie_json]);

    const modified = new Date(animation.modified).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    return (
        <div style={{
            background: '#fff', border: '1px solid #c3c4c7', borderRadius: 6,
            overflow: 'hidden', transition: 'box-shadow 0.2s',
        }}>
            {/* Preview */}
            <a href={editorUrl} style={{ display: 'block', textDecoration: 'none' }}>
                <div
                    ref={previewRef}
                    style={{
                        width: '100%', height: 180, background: '#f6f7f7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    {!animation.lottie_json && (
                        <span style={{ color: '#a7aaad', fontSize: 13 }}>Nessuna anteprima</span>
                    )}
                </div>
            </a>

            {/* Info */}
            <div style={{ padding: '12px 16px' }}>
                <a
                    href={editorUrl}
                    style={{
                        display: 'block', fontSize: 14, fontWeight: 600,
                        color: '#1d2327', textDecoration: 'none', marginBottom: 6,
                    }}
                >
                    {animation.title || 'Senza titolo'}
                </a>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#787c82' }}>
                        {animation.width}x{animation.height} &middot; {animation.fps}fps &middot; {animation.duration}s
                    </span>
                    <span style={{ fontSize: 11, color: '#a7aaad' }}>{modified}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: '1px solid #f0f0f1', paddingTop: 10 }}>
                    <a
                        href={editorUrl}
                        style={{
                            fontSize: 12, color: '#2271b1', textDecoration: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        Modifica
                    </a>
                    <button
                        onClick={onDelete}
                        style={{
                            fontSize: 12, color: '#d63638', background: 'none',
                            border: 'none', cursor: 'pointer', padding: 0,
                        }}
                    >
                        Elimina
                    </button>
                </div>
            </div>
        </div>
    );
}
