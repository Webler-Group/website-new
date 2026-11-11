import { HTMLAttributes } from "react";
import { cx, Variant } from "./utils";

interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    /** Bootstrap color variant (primary, danger, ...) */
    variant?: Exclude<Variant, "link"> | (string & {});
    dismissible?: boolean;
    onClose?: () => void;
    show?: boolean;
}

function Alert({ variant = "primary", dismissible, onClose, show = true, className, children, ...props }: AlertProps) {
    if (!show) return null;
    return (
        <div role="alert" className={cx("alert", `alert-${variant}`, dismissible && "alert-dismissible", className)} {...props}>
            {children}
            {dismissible && <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />}
        </div>
    );
}

function AlertHeading({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h4 className={cx("alert-heading", className)} {...props} />;
}

Alert.Heading = AlertHeading;

export default Alert;
