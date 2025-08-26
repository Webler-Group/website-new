import React, { useState } from 'react';
import { X, Share2 } from 'lucide-react';

interface ShareModalProps {
  feedId: string;
  onShare: (message: string) => void;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ feedId, onShare, onClose }) => {
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await onShare(shareMessage);
      onClose(); // close after successful share
    } catch (error) {
      console.error('Failed to share:', error);
    } finally {
      setIsSharing(false);
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
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg rounded-3 border-0">
          
          {/* Header */}
          <div className="modal-header border-bottom">
            <h5 className="modal-title d-flex align-items-center gap-2">
              <Share2 size={18} /> Share Post
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
            >
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Add your thoughts</label>
              <textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="What do you think about this post?"
                rows={4}
                className="form-control"
                disabled={isSharing}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-outline-secondary" 
              onClick={onClose}
              disabled={isSharing}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={handleShare}
              disabled={isSharing}
            >
              <Share2 size={16} />
              {isSharing ? 'Sharing...' : 'Share Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
