import React from "react";
import { FaEllipsisVertical } from "react-icons/fa6";

interface EllipsisDropdownToggleProps {
    onClick: (e: React.MouseEvent) => void;
}

const EllipsisDropdownToggle = React.forwardRef(({ onClick }: EllipsisDropdownToggleProps, ref: React.ForwardedRef<HTMLAnchorElement>) => (
    <a
        className="text-dark p-1"
        href=""
        ref={ref}
        onClick={(e) => {
            e.preventDefault();
            onClick(e);
        }}
    >
        <FaEllipsisVertical />
    </a>
));

export default EllipsisDropdownToggle