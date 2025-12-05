import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';

interface DeleteModalProps {
    show: boolean;
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
}

const DeleteModal = ({ show, onConfirm, onClose }: DeleteModalProps) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);
        await onConfirm();
        setIsDeleting(false);
    };

    return (
        <Modal show={show} onHide={onClose} centered backdropClassName='wb-feed-edit-modal__backdrop' style={{ zIndex: "1060" }}>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FaTrash />
                    Delete Post
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <p className="text-muted mb-0">
                    Are you sure you want to delete this post? This action cannot be undone.
                </p>
            </Modal.Body>

            <Modal.Footer>
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
            </Modal.Footer>
        </Modal>
    );
};

export default DeleteModal;