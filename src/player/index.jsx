import lottie from 'lottie-web';

document.addEventListener('DOMContentLoaded', () => {
  const players = document.querySelectorAll('.olo-lottie-player');

  players.forEach((container) => {
    const animationData = container.getAttribute('data-animation');
    if (!animationData) return;

    const loop = container.getAttribute('data-loop') !== 'false';
    const autoplay = container.getAttribute('data-autoplay') !== 'false';

    try {
      const parsed = JSON.parse(animationData);

      lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop,
        autoplay,
        animationData: parsed,
      });
    } catch (e) {
      console.error('[olo-lottie] Failed to parse animation data:', e);
    }
  });
});
