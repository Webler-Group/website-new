import FloatingMenu from "./FloatingMenu";
import { FaEdit } from "react-icons/fa";
import { FaRegCopy, FaReply, FaTrash } from "react-icons/fa6";

interface MessageContextMenuProps {
    visible: boolean;
    onClose: () => void;
    onCopy: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onReply: () => void;
    isOwn: boolean;
    anchorRef: React.RefObject<HTMLElement | null>;
}

const MessageContextMenu = ({
    visible, onClose, onCopy, onEdit, onDelete, onReply, isOwn, anchorRef
}: MessageContextMenuProps) => {
    return (
        <FloatingMenu visible={visible} onClose={onClose} anchorRef={anchorRef}>
            <button type="button" role="menuitem"
                className="w-100 text-start d-flex align-items-center px-2 py-1 btn btn-link text-decoration-none"
                onClick={onCopy}
            >
                <FaRegCopy className="me-1 text-muted" /> Copy text
            </button>
            <button type="button" role="menuitem"
                className="w-100 text-start d-flex align-items-center px-2 py-1 btn btn-link text-decoration-none"
                onClick={onReply}
            >
                <FaReply className="me-1 text-muted" /> Reply to
            </button>
            {isOwn && (
                <>
                    <button type="button" role="menuitem"
                        className="w-100 text-start d-flex align-items-center px-2 py-1 btn btn-link text-decoration-none"
                        onClick={onEdit}
                    >
                        <FaEdit className="me-1 text-muted" /> Edit
                    </button>
                    <button type="button" role="menuitem"
                        className="w-100 text-start d-flex align-items-center px-2 py-1 btn btn-link text-decoration-none text-danger"
                        onClick={onDelete}
                    >
                        <FaTrash className="me-1" /> Delete
                    </button>
                </>
            )}
        </FloatingMenu>
    );
};

export default MessageContextMenu;