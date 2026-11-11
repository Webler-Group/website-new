import { ElementType, HTMLAttributes } from "react";
import { cx } from "./utils";

interface PlaceholderProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
    as?: ElementType;
    animation?: "glow" | "wave";
    /** Column width of a placeholder bar */
    xs?: number;
    size?: "xs" | "sm" | "lg";
}

/**
 * With `animation` renders the animated wrapper; with `xs` renders a placeholder bar.
 * Mirrors Bootstrap's `placeholder-glow` / `placeholder col-*` markup.
 */
function Placeholder({ as: Component = "span", animation, xs, size, className, ...props }: PlaceholderProps) {
    const isBar = xs !== undefined || !animation;
    return (
        <Component
            className={cx(
                animation && `placeholder-${animation}`,
                isBar && "placeholder",
                xs !== undefined && `col-${xs}`,
                size && `placeholder-${size}`,
                className
            )}
            {...props}
        />
    );
}

export default Placeholder;
