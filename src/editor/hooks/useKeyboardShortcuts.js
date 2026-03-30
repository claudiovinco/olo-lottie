import { useEffect } from 'react';

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export default function useKeyboardShortcuts({
  dispatch,
  keyframeManager,
  onSave,
  onUndo,
  onRedo,
  state,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (isEditableTarget(e.target)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // Ctrl combinations
      if (ctrl) {
        switch (key) {
          case 'z':
            e.preventDefault();
            if (shift) {
              onRedo?.();
            } else {
              onUndo?.();
            }
            return;
          case 'y':
            e.preventDefault();
            onRedo?.();
            return;
          case 's':
            e.preventDefault();
            onSave?.();
            return;
          case 'd':
            e.preventDefault();
            if (state?.selectedLayerId) {
              dispatch({ type: 'DUPLICATE_LAYER', payload: state.selectedLayerId });
            }
            return;
          default:
            break;
        }
        return;
      }

      // Single key shortcuts
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (state?.selectedLayerId) {
            const layerId = state.selectedLayerId;
            keyframeManager?.removeAllKeyframes?.(layerId);
            const canvas = state?.canvas;
            if (canvas) {
              const obj = canvas.getObjects().find((o) => o.layerId === layerId);
              if (obj) {
                canvas.remove(obj);
                canvas.requestRenderAll();
              }
            }
            dispatch({ type: 'REMOVE_LAYER', payload: layerId });
          }
          return;
        case 'v':
          dispatch({ type: 'SET_TOOL', payload: 'select' });
          return;
        case 'r':
          dispatch({ type: 'SET_TOOL', payload: 'rect' });
          return;
        case 'e':
          dispatch({ type: 'SET_TOOL', payload: 'ellipse' });
          return;
        case 'p':
          dispatch({ type: 'SET_TOOL', payload: 'pen' });
          return;
        case 't':
          dispatch({ type: 'SET_TOOL', payload: 'text' });
          return;
        case 'h':
          dispatch({ type: 'SET_TOOL', payload: 'pan' });
          return;
        case '+':
        case '=':
          dispatch({ type: 'ZOOM_IN' });
          return;
        case '-':
          dispatch({ type: 'ZOOM_OUT' });
          return;
        case ' ':
          e.preventDefault();
          dispatch({ type: 'TOGGLE_PLAYBACK' });
          return;
        case '[':
          dispatch({ type: 'PREV_FRAME' });
          return;
        case ']':
          dispatch({ type: 'NEXT_FRAME' });
          return;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, keyframeManager, onSave, onUndo, onRedo, state]);
}
