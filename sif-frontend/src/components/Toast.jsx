import { CircleCheck, X } from 'lucide-react';
import { useEffect } from 'react';

const TOAST_MS = 5000;

// Small popup message at the bottom of the screen
export default function Toast({ message, onUndo, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, TOAST_MS);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <CircleCheck size={18} aria-hidden="true" className="toast-icon" />
      <span className="toast-message">{message}</span>
      {onUndo && (
        <button type="button" className="toast-action" onClick={onUndo}>
          Undo
        </button>
      )}
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
