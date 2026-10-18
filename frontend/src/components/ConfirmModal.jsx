import Modal from './Modal';
import './ConfirmModal.css';

export default function ConfirmModal({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onClose,
  width = 400,
}) {
  return (
    <Modal title={title} onClose={onClose} width={width}>
      <p className="confirm-modal-message">{message}</p>
      <div className="confirm-modal-actions">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="confirm-modal-cancel-btn"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`confirm-modal-confirm-btn ${danger ? 'danger' : 'blue'}`}
        >
          {loading ? 'Please wait…' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
