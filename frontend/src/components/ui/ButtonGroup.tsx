import { HTMLAttributes } from "react";
import { cx, Size } from "./utils";

interface ButtonGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    size?: Size;
    vertical?: boolean;
}

function ButtonGroup({ size, vertical, className, ...props }: ButtonGroupProps) {
    return (
        <div
            role="group"
            className={cx(vertical ? "btn-group-vertical" : "btn-group", size && `btn-group-${size}`, className)}
            {...props}
        />
    );
}

export default ButtonGroup;
