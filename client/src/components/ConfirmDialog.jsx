import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';

/// Used for every destructive action; deletes are never one-click.
export default function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Delete', busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={20} />
        </div>
        <p className="pt-2 text-sm text-ink-600">{message}</p>
      </div>
    </Modal>
  );
}
