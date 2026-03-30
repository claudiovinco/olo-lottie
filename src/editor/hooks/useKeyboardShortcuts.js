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
  fabricCanvasRef,
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
            const layer = state.layers?.find(l => l.id === layerId);
            const canvas = fabricCanvasRef?.current;
            if (canvas && layer?.fabricObject) {
              canvas.remove(layer.fabricObject);
              canvas.requestRenderAll();
            }
            keyframeManager?.removeAllKeyframes?.(layerId);
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
  }, [dispatch, keyframeManager, fabricCanvasRef, onSave, onUndo, onRedo, state]);
}
