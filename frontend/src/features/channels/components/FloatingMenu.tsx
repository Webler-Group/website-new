import { cssVars, mergeRefs } from "../../../components/ui";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

interface FloatingMenuProps {
    visible: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    children: ReactNode;
    /** Let clicks on the anchor through, so an anchor that toggles the menu can close it itself */
    ignoreAnchorClicks?: boolean;
}

const MARGIN = 8;

/** Menu popup anchored to an element, kept inside the viewport; closes on outside click, Escape or scroll. */
const FloatingMenu = ({ visible, onClose, anchorRef, children, ignoreAnchorClicks = false }: FloatingMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const updatePosition = () => {
        if (!menuRef.current || !anchorRef.current) return;
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
    };

    // Reposition to keep inside viewport after first render
    useLayoutEffect(() => {
        if (!visible) return;
        updatePosition();
    }, [visible]);

    useEffect(() => {
        if (!visible) return;

        let ignoreScroll = true;
        const scrollTimeout = setTimeout(() => { ignoreScroll = false; }, 250);

        const handleDocClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (menuRef.current?.contains(target)) return;
            if (ignoreAnchorClicks && anchorRef.current?.contains(target)) return;
            onClose();
        };
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        const handleResize = () => updatePosition();
        const handleScroll = () => {
            if (ignoreScroll) {
                updatePosition();
            } else {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleDocClick);
        document.addEventListener("keydown", handleKey);
        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", handleScroll, true);

        return () => {
            clearTimeout(scrollTimeout);
            document.removeEventListener("mousedown", handleDocClick);
            document.removeEventListener("keydown", handleKey);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [visible, onClose, ignoreAnchorClicks]);

    if (!visible) return null;

    return (
        <div
            ref={mergeRefs(menuRef, cssVars({ "--wb-channels-context-menu-top": pos.top, "--wb-channels-context-menu-left": pos.left }))}
            role="menu"
            className="wb-channels-context-menu position-fixed bg-body border rounded shadow-sm fs-6"
        >
            {children}
        </div>
    );
};

export default FloatingMenu;
