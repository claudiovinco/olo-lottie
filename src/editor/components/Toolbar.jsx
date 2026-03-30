import React from 'react';
import { useEditor } from '../core/EditorContext';

const tools = [
    { id: 'select', label: 'Select (V)', icon: 'M3,3L10,20L13,14L19,17L3,3Z' },
    { id: 'rect', label: 'Rectangle (R)', icon: 'M3,3H21V21H3V3M5,5V19H19V5H5Z' },
    { id: 'roundrect', label: 'Rounded Rect', icon: 'M7,3H17A4,4,0,0,1,21,7V17A4,4,0,0,1,17,21H7A4,4,0,0,1,3,17V7A4,4,0,0,1,7,3Z' },
    { id: 'ellipse', label: 'Ellipse (E)', icon: 'M12,2A10,10,0,1,0,22,12A10,10,0,0,0,12,2M12,4A8,8,0,1,1,4,12A8,8,0,0,1,12,4Z' },
    { id: 'star', label: 'Star', icon: 'M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26Z' },
    { id: 'polygon', label: 'Polygon', icon: 'M12,2L22,8.5V15.5L12,22L2,15.5V8.5Z' },
    { id: 'triangle', label: 'Triangle', icon: 'M12,3L22,21H2Z' },
    { id: 'line', label: 'Line', icon: 'M3,21L21,3' },
    { id: 'arrow', label: 'Arrow', icon: 'M5,19L19,5 M12,5H19V12' },
    { id: 'pen', label: 'Pen (P)', icon: 'M12,2L2,22H6L8,17H16L18,22H22L12,2Z M9.5,14L12,6L14.5,14H9.5Z' },
    { id: 'pencil', label: 'Pencil', icon: 'M3,21L4.5,15.5L17,3L21,7L8.5,19.5L3,21Z M14.5,5.5L18.5,9.5' },
    { id: 'text', label: 'Text (T)', icon: 'M5,4V7H10.5V19H13.5V7H19V4H5Z' },
    { id: 'eyedropper', label: 'Eyedropper', icon: 'M20.71,5.63L18.37,3.29A1,1,0,0,0,16.96,3.29L14,6.25L12,4.25L10.59,5.66L12,7.08L4,15.08V20H8.92L16.92,12L18.33,13.41L19.75,12L17.75,10L20.71,7.04A1,1,0,0,0,20.71,5.63Z' },
    { id: 'eraser', label: 'Eraser', icon: 'M16.24,3.56L21.19,8.5C21.97,9.29,21.97,10.55,21.19,11.34L12,20.53L2.81,11.34C2.03,10.55,2.03,9.29,2.81,8.5L7.76,3.56C8.54,2.78,9.81,2.78,10.59,3.56L12,4.97L13.41,3.56C14.19,2.78,15.46,2.78,16.24,3.56Z' },
    { id: 'pan', label: 'Pan (H)', icon: 'M12,2L9,5H11V11H5V9L2,12L5,15V13H11V19H9L12,22L15,19H13V13H19V15L22,12L19,9V11H13V5H15L12,2Z' },
    { id: 'zoom_in', label: 'Zoom In (+)', icon: 'M15.5,14L20.5,19L19,20.5L14,15.5V14.71L13.73,14.43C12.59,15.41,11.11,16,9.5,16A6.5,6.5,0,1,1,16,9.5C16,11.11,15.41,12.59,14.43,13.73L14.71,14H15.5Z M9.5,14A4.5,4.5,0,1,0,5,9.5A4.5,4.5,0,0,0,9.5,14Z M12,10H10V12H9V10H7V9H9V7H10V9H12V10Z' },
    { id: 'zoom_out', label: 'Zoom Out (-)', icon: 'M15.5,14L20.5,19L19,20.5L14,15.5V14.71L13.73,14.43C12.59,15.41,11.11,16,9.5,16A6.5,6.5,0,1,1,16,9.5C16,11.11,15.41,12.59,14.43,13.73L14.71,14H15.5Z M9.5,14A4.5,4.5,0,1,0,5,9.5A4.5,4.5,0,0,0,9.5,14Z M7,9H12V10H7V9Z' },
];

export default React.memo(function Toolbar() {
    const { state, dispatch } = useEditor();

    return (
        <div className="olo-lottie-toolbar">
            {tools.map(tool => (
                <button
                    key={tool.id}
                    className={`olo-lottie-tool ${state.activeTool === tool.id ? 'olo-lottie-tool--active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_TOOL', payload: tool.id })}
                    title={tool.label}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={tool.icon} />
                    </svg>
                    <span className="olo-lottie-tool__tooltip">{tool.label}</span>
                </button>
            ))}

            <div style={{ flex: 1 }} />

            <button
                className="olo-lottie-tool"
                title="Import SVG"
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.svg';
                    input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                window.dispatchEvent(new CustomEvent('olo-lottie-import-svg', {
                                    detail: { svg: ev.target.result }
                                }));
                            };
                            reader.readAsText(file);
                        }
                    };
                    input.click();
                }}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21,14L12,3L3,14H7V21H17V14H21Z" />
                </svg>
                <span className="olo-lottie-tool__tooltip">Import SVG</span>
            </button>

            <button
                className={`olo-lottie-tool ${state.showBones ? 'olo-lottie-tool--active' : ''}`}
                title={state.showBones ? 'Hide Bones' : 'Show Bones'}
                onClick={() => dispatch({ type: 'TOGGLE_BONES' })}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="6" r="2" />
                    <circle cx="18" cy="18" r="2" />
                    <line x1="7.5" y1="7.5" x2="16.5" y2="16.5" />
                    <circle cx="12" cy="12" r="1.5" />
                </svg>
                <span className="olo-lottie-tool__tooltip">{state.showBones ? 'Hide Bones' : 'Show Bones'}</span>
            </button>
        </div>
    );
});
