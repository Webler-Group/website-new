import { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "./utils";

function Breadcrumb({ className, children, ...props }: Omit<HTMLAttributes<HTMLElement>, "style">) {
    return (
        <nav aria-label="breadcrumb" {...props}>
            <ol className={cx("breadcrumb", className)}>{children}</ol>
        </nav>
    );
}

interface BreadcrumbItemProps {
    /** Target route; items without it render as plain text */
    to?: string;
    active?: boolean;
    className?: string;
    children?: ReactNode;
}

function BreadcrumbItem({ to, active, className, children }: BreadcrumbItemProps) {
    return (
        <li className={cx("breadcrumb-item", active && "active", className)} aria-current={active ? "page" : undefined}>
            {to && !active ? <Link to={to}>{children}</Link> : children}
        </li>
    );
}

Breadcrumb.Item = BreadcrumbItem;

export default Breadcrumb;
