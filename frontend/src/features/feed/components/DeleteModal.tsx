import React, { useState } from 'react';
import { FaTimes, FaTrash } from 'react-icons/fa';

interface DeleteModalProps {
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ onConfirm, onClose }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);
        await onConfirm();
        setIsDeleting(false);
    };

    return (
        <div
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
            onClick={onClose}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">

                    {/* Header */}
                    <div className="modal-header bg-light border-0">
                        <h5 className="modal-title d-flex align-items-center gap-2 fw-semibold text-danger mb-0">
                            <FaTrash />
                            Delete Post
                        </h5>
                        <button
                            type="button"
                            className="btn btn-sm btn-icon btn-outline-secondary"
                            aria-label="Close"
                            onClick={onClose}
                            disabled={isDeleting}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="modal-body bg-white">
                        <p className="text-muted mb-0">
                            Are you sure you want to delete this post? This action cannot be undone.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer border-0 d-flex justify-content-end gap-2">
                        <button
                            onClick={onClose}
                            className="btn btn-light px-4 rounded-3 shadow-sm"
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isDeleting}
                            className="btn btn-danger px-4 d-inline-flex align-items-center gap-2 rounded-3 shadow-sm"
                        >
                            <FaTrash />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal;