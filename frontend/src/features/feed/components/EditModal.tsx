import { useState } from 'react';
import PostTextareaControl from '../../../components/PostTextareaControl';
import { IFeed } from './types';
import { FaSave, FaEye, FaPen } from 'react-icons/fa';
import allowedUrls from '../../../data/discussAllowedUrls';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import { Modal } from 'react-bootstrap';

interface EditModalProps {
  show: boolean;
  feed: IFeed;
  onSave: (content: string) => void | Promise<void>;
  onClose: () => void;
}

const EditModal = ({ show, feed, onSave, onClose }: EditModalProps) => {
  const [content, setContent] = useState(feed.message);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"write" | "preview">("write");

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
          <label className="form-label fw-medium text-muted">Post Content</label>

          <div className="d-flex gap-2 mb-2">
            <button
              type="button"
              className={`btn btn-sm ${mode === "write" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("write")}
            >
              <FaPen className="me-1" /> Write
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === "preview" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("preview")}
            >
              <FaEye className="me-1" /> Preview
            </button>
          </div>

          {mode === "write" && (
            <PostTextareaControl
              value={content}
              setValue={setContent}
              placeholder="What's on your mind?"
              rows={12}
            />
          )}

          {mode === "preview" && (
            <MarkdownRenderer
              content={content}
              allowedUrls={allowedUrls}
            />
          )}
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
