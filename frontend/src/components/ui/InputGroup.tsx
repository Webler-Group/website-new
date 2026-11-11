import { HTMLAttributes } from "react";
import { cx, Size } from "./utils";

interface InputGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    size?: Size;
}

function InputGroup({ size, className, ...props }: InputGroupProps) {
    return <div className={cx("input-group", size && `input-group-${size}`, className)} {...props} />;
}

function InputGroupText({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return <span className={cx("input-group-text", className)} {...props} />;
}

InputGroup.Text = InputGroupText;

export default InputGroup;
