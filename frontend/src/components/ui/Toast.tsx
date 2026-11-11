import { createContext, HTMLAttributes, useContext, useEffect, useRef } from "react";
import { cx, Variant } from "./utils";

const ToastContext = createContext<{ onClose?: () => void }>({});

interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    show?: boolean;
    onClose?: () => void;
    autohide?: boolean;
    /** Milliseconds before an autohide toast closes */
    delay?: number;
    bg?: Exclude<Variant, "link">;
}

function Toast({ show = true, onClose, autohide, delay = 5000, bg, className, children, ...props }: ToastProps) {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!show || !autohide) return;
        const timer = setTimeout(() => onCloseRef.current?.(), delay);
        return () => clearTimeout(timer);
    }, [show, autohide, delay]);

    if (!show) return null;

    return (
        <ToastContext.Provider value={{ onClose }}>
            <div role="alert" aria-live="assertive" aria-atomic="true" className={cx("toast show", bg && `bg-${bg}`, className)} {...props}>
                {children}
            </div>
        </ToastContext.Provider>
    );
}

interface ToastHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    closeButton?: boolean;
}

function ToastHeader({ closeButton = true, className, children, ...props }: ToastHeaderProps) {
    const { onClose } = useContext(ToastContext);
    return (
        <div className={cx("toast-header", className)} {...props}>
            {children}
            {closeButton && <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />}
        </div>
    );
}

function ToastBody({ className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, "style">) {
    return <div className={cx("toast-body", className)} {...props} />;
}

Toast.Header = ToastHeader;
Toast.Body = ToastBody;

type ToastPosition =
    | "top-start" | "top-center" | "top-end"
    | "middle-start" | "middle-center" | "middle-end"
    | "bottom-start" | "bottom-center" | "bottom-end";

const positionClasses: Record<ToastPosition, string> = {
    "top-start": "top-0 start-0",
    "top-center": "top-0 start-50 translate-middle-x",
    "top-end": "top-0 end-0",
    "middle-start": "top-50 start-0 translate-middle-y",
    "middle-center": "top-50 start-50 translate-middle",
    "middle-end": "top-50 end-0 translate-middle-y",
    "bottom-start": "bottom-0 start-0",
    "bottom-center": "bottom-0 start-50 translate-middle-x",
    "bottom-end": "bottom-0 end-0"
};

interface ToastContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    position?: ToastPosition;
}

export function ToastContainer({ position, className, ...props }: ToastContainerProps) {
    return (
        <div
            className={cx("toast-container", position && "position-fixed wb-ui-toast-container", position && positionClasses[position], className)}
            {...props}
        />
    );
}

export default Toast;
