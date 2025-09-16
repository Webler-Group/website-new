import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
    anchorRef: React.RefObject<HTMLElement>;
}

const MARGIN = 8;

const MessageContextMenu = ({
    visible, onClose, onCopy, onEdit, onDelete, onReply, isOwn, anchorRef
}: MessageContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    // Reposition to keep inside viewport after first render
    useLayoutEffect(() => {
        if (!visible || !menuRef.current || !anchorRef.current) return;
        const el = menuRef.current;
        const { offsetWidth: w, offsetHeight: h } = el;
        const rect = anchorRef.current.getBoundingClientRect();

        let top = rect.bottom;
        let left = rect.left;

        if (top + h > window.innerHeight - MARGIN) {
            top = rect.top - h;
        }
        if (left + w > window.innerWidth - MARGIN) {
            left = rect.right - w;
        }

        // Clamp to viewport
        top = Math.min(Math.max(MARGIN, top), window.innerHeight - h - MARGIN);
        left = Math.min(Math.max(MARGIN, left), window.innerWidth - w - MARGIN);

        setPos({ top, left });
    }, [visible]);

    // Close on outside click, scroll, resize, and Escape
    useEffect(() => {
        if (!visible) return;

        const handleDocClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        const handleViewportChange = () => onClose();

        document.addEventListener("mousedown", handleDocClick);
        window.addEventListener("resize", handleViewportChange);
        window.addEventListener("scroll", handleViewportChange, true);
        document.addEventListener("keydown", handleKey);

        return () => {
            document.removeEventListener("mousedown", handleDocClick);
            window.removeEventListener("resize", handleViewportChange);
            window.removeEventListener("scroll", handleViewportChange, true);
            document.removeEventListener("keydown", handleKey);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    return (
        <div
            ref={menuRef}
            role="menu"
            className="position-fixed bg-white border rounded shadow-sm"
            style={{ top: pos.top, left: pos.left, zIndex: 2000, minWidth: 180 }}
        >
            <button type="button" role="menuitem"
                className="w-100 text-start d-flex align-items-center px-3 py-2 btn btn-link text-decoration-none"
                onClick={onCopy}
            >
                <FaRegCopy className="me-2 text-muted" /> Copy text
            </button>
            <button type="button" role="menuitem"
                className="w-100 text-start d-flex align-items-center px-3 py-2 btn btn-link text-decoration-none"
                onClick={onReply}
            >
                <FaReply className="me-2 text-muted" /> Reply to
            </button>
            {isOwn && (
                <>
                    <button type="button" role="menuitem"
                        className="w-100 text-start d-flex align-items-center px-3 py-2 btn btn-link text-decoration-none"
                        onClick={onEdit}
                    >
                        <FaEdit className="me-2 text-muted" /> Edit
                    </button>
                    <button type="button" role="menuitem"
                        className="w-100 text-start d-flex align-items-center px-3 py-2 btn btn-link text-decoration-none text-danger"
                        onClick={onDelete}
                    >
                        <FaTrash className="me-2" /> Delete
                    </button>
                </>
            )}
        </div>
    );
};

export default MessageContextMenu;