import { useState } from 'react';
import { FormLabel, Modal } from 'react-bootstrap';
import { FaCopy, FaShare, FaShareNodes } from 'react-icons/fa6';
import MdEditorField from '../../../components/MdEditorField';

interface ShareModalProps {
  show: boolean;
  feedId: string;
  onShare: (message: string, tags: string[]) => Promise<void> | void;
  onClose: () => void;
}

const ShareModal = ({ show, feedId, onShare, onClose }: ShareModalProps) => {
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tags] = useState<string[]>([]);

  const shareUrl = window.location.origin + `/feed/${feedId}`;

  const handleShare = async () => {
    setIsSharing(true);
    await onShare(shareMessage, tags);
    onClose()
    setIsSharing(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal show={show} onHide={onClose} size='lg' centered backdropClassName='wb-feed-edit-modal__backdrop' fullscreen="sm-down" backdrop="static" style={{ zIndex: "1060" }}>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaShare />
          Share Post
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className='mb-2'>
          <FormLabel className="form-label">Add your thoughts</FormLabel>
          <MdEditorField
            section="Profile"
            text={shareMessage}
            setText={setShareMessage}
            row={10}
            placeHolder={"What do you think about this post?"}
          />
        </div>

        <div className="d-flex align-items-center justify-content-between p-2 border rounded bg-light">
          <span className="text-truncate me-2" style={{ maxWidth: '75%' }}>
            {shareUrl}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={handleCopyLink}
          >
            <FaCopy />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </Modal.Body>

      <Modal.Footer>
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
          <FaShareNodes />
          {isSharing ? 'Sharing...' : 'Share Post'}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ShareModal;
