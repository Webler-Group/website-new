import { createContext, HTMLAttributes, ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import { cx, useOverlay } from "./utils";

interface ModalContextValue {
    onHide?: () => void;
}

const ModalContext = createContext<ModalContextValue>({});

type Breakpoint = "sm" | "md" | "lg" | "xl" | "xxl";

interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    show?: boolean;
    onHide?: () => void;
    size?: "sm" | "lg" | "xl";
    centered?: boolean;
    fullscreen?: true | `${Breakpoint}-down`;
    /** "static" disables closing by clicking the backdrop */
    backdrop?: boolean | "static";
    keyboard?: boolean;
    dialogClassName?: string;
    contentClassName?: string;
    backdropClassName?: string;
    children?: ReactNode;
    "data-bs-theme"?: "light" | "dark";
}

/**
 * Bootstrap modal rendered through a portal. Every modal carries its own backdrop inside its
 * root element, so modals opened later always stack above earlier ones without z-index tweaks.
 */
function Modal({
    show = false,
    onHide,
    size,
    centered,
    fullscreen,
    backdrop = true,
    keyboard = true,
    className,
    dialogClassName,
    contentClassName,
    backdropClassName,
    children,
    ...props
}: ModalProps) {
    useOverlay(show, keyboard ? onHide : undefined);

    if (!show) return null;

    const handleBackdropClick = () => {
        if (backdrop !== "static") onHide?.();
    };

    return createPortal(
        <ModalContext.Provider value={{ onHide }}>
            <div className={cx("modal d-block wb-ui-modal", className)} role="dialog" aria-modal="true" tabIndex={-1} {...props}>
                {backdrop !== false && (
                    <div className={cx("modal-backdrop show wb-ui-modal-backdrop", backdropClassName)} onClick={handleBackdropClick} />
                )}
                <div
                    className={cx(
                        "modal-dialog wb-ui-modal-dialog",
                        size && `modal-${size}`,
                        centered && "modal-dialog-centered",
                        fullscreen === true && "modal-fullscreen",
                        typeof fullscreen === "string" && `modal-fullscreen-${fullscreen}`,
                        dialogClassName
                    )}
                >
                    <div className={cx("modal-content", contentClassName)}>{children}</div>
                </div>
            </div>
        </ModalContext.Provider>,
        document.body
    );
}

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
    closeButton?: boolean;
}

function ModalHeader({ closeButton, className, children, ...props }: ModalHeaderProps) {
    const { onHide } = useContext(ModalContext);
    return (
        <div className={cx("modal-header", className)} {...props}>
            {children}
            {closeButton && <button type="button" className="btn-close" aria-label="Close" onClick={onHide} />}
        </div>
    );
}

function ModalTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h5 className={cx("modal-title", className)} {...props} />;
}

const ModalBody = ({ className, ref, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
    <div ref={ref} className={cx("modal-body", className)} {...props} />
);

function ModalFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cx("modal-footer", className)} {...props} />;
}

Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;
