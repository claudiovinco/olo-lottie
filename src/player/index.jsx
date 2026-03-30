import lottie from 'lottie-web';

const REQUIRED_FIELDS = ['v', 'fr', 'ip', 'op', 'w', 'h', 'layers'];

function validateLottieJSON(data) {
    if (!data || typeof data !== 'object') return false;
    return REQUIRED_FIELDS.every(f => f in data) && Array.isArray(data.layers);
}

function initPlayer(container) {
    const animationId = container.getAttribute('data-animation-id');
    const animationData = container.getAttribute('data-animation');
    const loop = container.getAttribute('data-loop') !== 'false';
    const autoplay = container.getAttribute('data-autoplay') !== 'false';

    // REST API fetch (preferred)
    if (animationId) {
        const restUrl = container.getAttribute('data-rest-url') || '/wp-json/olo-lottie/v1/';
        fetch(`${restUrl}public/animations/${animationId}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                const json = data.lottie_json || data;
                if (!validateLottieJSON(json)) {
                    console.error('[olo-lottie] Invalid Lottie JSON structure');
                    return;
                }
                const anim = lottie.loadAnimation({
                    container, renderer: 'svg', loop, autoplay, animationData: json,
                });
                setupIntersectionObserver(container, anim, autoplay);
            })
            .catch(e => console.error('[olo-lottie] Failed to load animation:', e));
        return;
    }

    // Inline data fallback (backward compatibility)
    if (animationData) {
        try {
            const parsed = JSON.parse(animationData);
            if (!validateLottieJSON(parsed)) {
                console.error('[olo-lottie] Invalid Lottie JSON structure');
                return;
            }
            const anim = lottie.loadAnimation({
                container, renderer: 'svg', loop, autoplay, animationData: parsed,
            });
            setupIntersectionObserver(container, anim, autoplay);
        } catch (e) {
            console.error('[olo-lottie] Failed to parse animation data:', e);
        }
    }
}

function setupIntersectionObserver(container, anim, autoplay) {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (autoplay) anim.play();
            } else {
                anim.pause();
            }
        });
    }, { rootMargin: '200px' });

    observer.observe(container);
}

document.addEventListener('DOMContentLoaded', () => {
    const players = document.querySelectorAll('.olo-lottie-player');
    players.forEach(initPlayer);
});
