const { registerBlockType } = wp.blocks;
const { InspectorControls } = wp.blockEditor || wp.editor;
const { PanelBody, TextControl, ToggleControl } = wp.components;
const { createElement: el, useState, useEffect } = wp.element;

registerBlockType('olo-lottie/player', {
    title: 'Olo Lottie',
    icon: 'format-video',
    category: 'media',
    attributes: {
        animationId: { type: 'number', default: 0 },
        width: { type: 'string', default: '100%' },
        height: { type: 'string', default: '300px' },
        loop: { type: 'boolean', default: true },
        autoplay: { type: 'boolean', default: true },
    },

    edit: function EditBlock({ attributes, setAttributes }) {
        const [animations, setAnimations] = useState([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            fetch(`${window.oloLottie?.restUrl || '/wp-json/olo-lottie/v1/'}animations`, {
                headers: { 'X-WP-Nonce': window.oloLottie?.nonce || '' },
            })
                .then(r => r.json())
                .then(data => { setAnimations(data); setLoading(false); })
                .catch(() => setLoading(false));
        }, []);

        const selected = animations.find(a => a.id === attributes.animationId);

        return el('div', {},
            el(InspectorControls, {},
                el(PanelBody, { title: 'Animation Settings' },
                    el(TextControl, {
                        label: 'Width',
                        value: attributes.width,
                        onChange: v => setAttributes({ width: v }),
                    }),
                    el(TextControl, {
                        label: 'Height',
                        value: attributes.height,
                        onChange: v => setAttributes({ height: v }),
                    }),
                    el(ToggleControl, {
                        label: 'Loop',
                        checked: attributes.loop,
                        onChange: v => setAttributes({ loop: v }),
                    }),
                    el(ToggleControl, {
                        label: 'Autoplay',
                        checked: attributes.autoplay,
                        onChange: v => setAttributes({ autoplay: v }),
                    }),
                ),
            ),
            el('div', {
                style: {
                    border: '2px dashed #89b4fa',
                    borderRadius: 8,
                    padding: 24,
                    textAlign: 'center',
                    background: '#f0f0f5',
                },
            },
                loading
                    ? el('p', {}, 'Loading animations...')
                    : animations.length === 0
                        ? el('p', {}, 'No animations found. Create one in the Olo Lottie editor.')
                        : el('div', {},
                            el('label', { style: { fontWeight: 600, display: 'block', marginBottom: 8 } }, 'Select Animation:'),
                            el('select', {
                                value: attributes.animationId || '',
                                onChange: (e) => setAttributes({ animationId: parseInt(e.target.value) || 0 }),
                                style: { width: '100%', padding: 8 },
                            },
                                el('option', { value: '' }, '-- Select --'),
                                ...animations.map(a =>
                                    el('option', { key: a.id, value: a.id }, `${a.title} (ID: ${a.id})`)
                                ),
                            ),
                            selected && el('p', { style: { marginTop: 8, color: '#666' } },
                                `${selected.width}x${selected.height} @ ${selected.fps}fps - ${selected.duration}s`
                            ),
                        ),
            ),
        );
    },

    save: function () {
        return null; // Server-side rendered
    },
});
