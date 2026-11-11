import { HTMLAttributes } from "react";
import { cx, Variant } from "./utils";

interface SpinnerProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    animation?: "border" | "grow";
    size?: "sm";
    variant?: Exclude<Variant, "link">;
}

function Spinner({ animation = "border", size, variant, className, ...props }: SpinnerProps) {
    return (
        <div
            role="status"
            className={cx(`spinner-${animation}`, size && `spinner-${animation}-${size}`, variant && `text-${variant}`, className)}
            {...props}
        >
            <span className="visually-hidden">Loading...</span>
        </div>
    );
}

export default Spinner;
