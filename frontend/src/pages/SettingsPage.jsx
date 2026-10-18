import { useState } from 'react';
import userService from '../services/userService';
import ConfirmModal from '../components/ConfirmModal';
import './SettingsPage.css';

export default function SettingsPage({ user, show, onLogout, onUserUpdate }) {
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword && newPassword.length < 6) {
      return show('New password must be at least 6 characters', 'error');
    }
    setLoading(true);
    try {
      const updated = await userService.update(user.username, firstName, newPassword || undefined);
      show('Profile updated successfully');
      setNewPassword('');
      onUserUpdate(updated);
    } catch (e) {
      show(e.message, 'error');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await userService.remove(user.username);
      setShowDeleteModal(false);
      onLogout();
    } catch (e) {
      show(e.message, 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="settings-page">
      <h2 className="settings-title">Settings</h2>

      <div className="settings-card">
        <p className="label-micro settings-section-title">Profile & Security</p>
        <form onSubmit={save} className="settings-form">
          <div className="settings-field">
            <label className="label-micro settings-lbl">Username</label>
            <input className="settings-input" value={user?.username || ''} disabled />
          </div>
          <div className="settings-field">
            <label className="label-micro settings-lbl">First Name</label>
            <input
              className="settings-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="settings-field">
            <label className="label-micro settings-lbl">New Password (Optional)</label>
            <input
              className="settings-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="settings-btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes →'}
          </button>
        </form>
      </div>

      <div className="settings-card danger-zone">
        <p className="label-micro settings-section-title danger">Danger Zone</p>
        <p className="settings-danger-desc">
          Permanently deletes your account and all associated transactions and budgets.
        </p>
        <button
          className="settings-btn-danger"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Account
        </button>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Account"
          message={`Are you sure you want to permanently delete account "${user?.username}"? All transactions, budgets, and balance history will be erased. This action cannot be undone.`}
          confirmText="Yes, Delete My Account"
          danger={true}
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
