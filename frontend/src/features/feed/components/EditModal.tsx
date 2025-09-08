import React, { useState } from 'react';
import PostTextareaControl from '../../../components/PostTextareaControl';
import InputTags from '../../../components/InputTags';
import { IFeed } from './types';
import { FaSave, FaTimes } from 'react-icons/fa';

interface EditModalProps {
  feed: IFeed;
  onSave: (content: string, tags: string[]) => void | Promise<void>;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ feed, onSave, onClose }) => {
  const [content, setContent] = useState(feed.message);
  const [tags, setTags] = useState<string[]>(feed.tags);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    
    await onSave(content.trim(), tags);
    setIsSaving(false);
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">

          {/* Header */}
          <div className="modal-header bg-light border-0">
            <h5 className="modal-title d-flex align-items-center gap-2 fw-semibold text-dark mb-0">
              <FaSave />
              Edit Post
            </h5>
            <button
              type="button"
              className="btn btn-sm btn-icon btn-outline-secondary"
              aria-label="Close"
              onClick={onClose}
              disabled={isSaving}
            >
              <FaTimes />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body bg-white">
            <div className="mb-3">
              <label className="form-label fw-medium text-muted">Post Content</label>
              <PostTextareaControl
                value={content}
                setValue={setContent}
                placeholder="What's on your mind?"
                rows={6}
              />
            </div>
            {/* Tags */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Tags</label>
              <InputTags
                values={tags}
                setValues={setTags}
                placeholder="Add tags..."
              />
              <div className="mt-1 text-muted small">
                {tags.length}/10 tags selected
              </div>
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
              <FaSave />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
