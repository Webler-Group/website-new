import { createContext, HTMLAttributes, ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import { cx, useOverlay } from "./utils";

interface OffcanvasContextValue {
    onHide?: () => void;
}

const OffcanvasContext = createContext<OffcanvasContextValue>({});

interface OffcanvasProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    show: boolean;
    onHide?: () => void;
    placement?: "start" | "end" | "top" | "bottom";
    /** Breakpoint from which the content is rendered inline instead of as an offcanvas */
    responsive?: "sm" | "md" | "lg" | "xl" | "xxl";
    backdropClassName?: string;
    children?: ReactNode;
}

function Offcanvas({
    show,
    onHide,
    placement = "start",
    responsive,
    className,
    backdropClassName,
    children,
    ...props
}: OffcanvasProps) {
    useOverlay(show, onHide);

    const panel = (
        <div
            className={cx(
                responsive ? `offcanvas-${responsive}` : "offcanvas wb-ui-offcanvas",
                `offcanvas-${placement}`,
                show && "show",
                className
            )}
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    );

    const backdrop = show && (
        <div
            className={cx("offcanvas-backdrop show", responsive && `d-${responsive}-none`, backdropClassName)}
            onClick={onHide}
        />
    );

    // Responsive offcanvases stay in the document flow so they can render inline on wide screens
    if (responsive) {
        return (
            <OffcanvasContext.Provider value={{ onHide }}>
                {panel}
                {backdrop}
            </OffcanvasContext.Provider>
        );
    }

    if (!show) return null;

    // Same stacking layer as modals: overlays opened later always render above earlier ones
    return createPortal(
        <OffcanvasContext.Provider value={{ onHide }}>
            <div className="wb-ui-overlay-layer">
                {backdrop}
                {panel}
            </div>
        </OffcanvasContext.Provider>,
        document.body
    );
}

interface OffcanvasHeaderProps extends HTMLAttributes<HTMLDivElement> {
    closeButton?: boolean;
}

function OffcanvasHeader({ closeButton, className, children, ...props }: OffcanvasHeaderProps) {
    const { onHide } = useContext(OffcanvasContext);
    return (
        <div className={cx("offcanvas-header", className)} {...props}>
            {children}
            {closeButton && <button type="button" className="btn-close" aria-label="Close" onClick={onHide} />}
        </div>
    );
}

function OffcanvasTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h5 className={cx("offcanvas-title", className)} {...props} />;
}

function OffcanvasBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cx("offcanvas-body", className)} {...props} />;
}

Offcanvas.Header = OffcanvasHeader;
Offcanvas.Title = OffcanvasTitle;
Offcanvas.Body = OffcanvasBody;

export default Offcanvas;
