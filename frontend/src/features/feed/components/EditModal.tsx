import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

interface EditModalProps {
  initialContent: string;
  onSave: (content: string) => void | Promise<void>;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ initialContent, onSave, onClose }) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;

    try {
      setIsSaving(true);
      await onSave(content.trim());
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header bg-light border-0">
            <h5 className="modal-title d-flex align-items-center gap-2 fw-semibold text-dark mb-0">
              <Save size={18} />
              Edit Post
            </h5>
            <button 
              type="button"
              className="btn btn-sm btn-icon btn-outline-secondary rounded-circle"
              aria-label="Close"
              onClick={onClose}
              disabled={isSaving}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body bg-white">
            <div className="mb-3">
              <label className="form-label fw-medium text-muted">Post Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={6}
                className="form-control rounded-3 shadow-sm"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 d-flex justify-content-end gap-2">
            <button
              onClick={onClose}
              className="btn btn-light px-4 rounded-3 shadow-sm"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className="btn btn-primary px-4 d-inline-flex align-items-center gap-2 rounded-3 shadow-sm"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
