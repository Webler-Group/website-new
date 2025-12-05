import { useState } from 'react';
import { IFeed } from './types';
import { FaSave } from 'react-icons/fa';
import { FormLabel, Modal } from 'react-bootstrap';
import MdEditorField from '../../../components/MdEditorField';

interface EditModalProps {
  show: boolean;
  feed: IFeed;
  onSave: (content: string) => void | Promise<void>;
  onClose: () => void;
}

const EditModal = ({ show, feed, onSave, onClose }: EditModalProps) => {
  const [content, setContent] = useState(feed.message);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    await onSave(content.trim());
    setIsSaving(false);
  };

  return (
    <Modal show={show} onHide={onClose} size='lg' centered backdrop="static" backdropClassName='wb-feed-edit-modal__backdrop' fullscreen="sm-down" style={{ zIndex: "1060" }}>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaSave />
          Edit Post
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: "70vh", overflow: "auto" }}>
        <div>
          <FormLabel className="form-label fw-medium text-muted">Post Content</FormLabel>

          <MdEditorField
            text={content}
            setText={setContent}
            row={10}
            placeHolder={"What do you think about this post?"}
          />
        </div>

      </Modal.Body>

      <Modal.Footer>
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
          <FaSave />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditModal;
