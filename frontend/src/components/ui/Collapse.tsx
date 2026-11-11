import { ReactElement, cloneElement } from "react";
import { cx } from "./utils";

interface CollapseProps {
    in: boolean;
    children: ReactElement<{ className?: string }>;
}

/** Shows / hides its single child using Bootstrap's `collapse` classes. */
function Collapse({ in: isOpen, children }: CollapseProps) {
    return cloneElement(children, {
        className: cx(children.props.className, "collapse", isOpen && "show")
    });
}

export default Collapse;
