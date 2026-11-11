import { HTMLAttributes } from "react";
import { cx, Variant } from "./utils";

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "style"> {
    bg?: Exclude<Variant, "link">;
    text?: Exclude<Variant, "link">;
    pill?: boolean;
}

function Badge({ bg = "primary", text, pill, className, ...props }: BadgeProps) {
    return <span className={cx("badge", `bg-${bg}`, text && `text-${text}`, pill && "rounded-pill", className)} {...props} />;
}

export default Badge;
