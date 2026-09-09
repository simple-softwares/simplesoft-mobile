import Toast from 'react-native-toast-message';

/**
 * Show a 5-second "deleted · Undo" toast. The actual delete is deferred.
 *
 * @param {string}        label    — "Task", "Note", "Contact", etc.
 * @param {() => void}    onDelete — called after 5 s if not undone (async ok)
 * @param {() => void}   [onUndo] — called immediately when Undo is tapped
 */
export const undoDelete = (label, onDelete, onUndo) => {
  let cancelled = false;

  Toast.show({
    type: 'undo',
    text1: `${label} deleted`,
    position: 'bottom',
    bottomOffset: 72,
    visibilityTime: 5000,
    autoHide: true,
    onHide: () => {
      if (!cancelled) onDelete();
    },
    props: {
      onUndo: () => {
        cancelled = true;
        Toast.hide();
        onUndo?.();
      },
    },
  });
};
