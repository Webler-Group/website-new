import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreatePostModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (message: string) => Promise<void>;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ show, onHide, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(message.trim());
      setMessage('');
    } catch (err) {
      setError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage('');
      setError(null);
      onHide();
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-semibold">Create New Post</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              disabled={isSubmitting}
            >
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              <textarea
                className="form-control border-0 bg-light"
                rows={4}
                placeholder="What's on your mind?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
                required
              />
              
              <div className="mt-2 text-muted small">
                {message.length}/2000 characters
              </div>
            </div>
            
            <div className="modal-footer border-0 pt-0">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary d-flex align-items-center gap-2"
                disabled={!message.trim() || isSubmitting}
              >
                {isSubmitting && <Loader2 size={16} className="spinner-border spinner-border-sm" />}
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;