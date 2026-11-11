import { HTMLAttributes, LiHTMLAttributes } from "react";
import { cx, Variant } from "./utils";

interface ListGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    flush?: boolean;
}

function ListGroup({ flush, className, ...props }: ListGroupProps) {
    return <div className={cx("list-group", flush && "list-group-flush", className)} {...props} />;
}

interface ListGroupItemProps extends Omit<LiHTMLAttributes<HTMLElement>, "style"> {
    action?: boolean;
    active?: boolean;
    variant?: Exclude<Variant, "link">;
}

function ListGroupItem({ action, active, variant, className, ...props }: ListGroupItemProps) {
    const classes = cx(
        "list-group-item",
        action && "list-group-item-action",
        active && "active",
        variant && `list-group-item-${variant}`,
        className
    );
    if (action) {
        return <button type="button" className={classes} {...(props as HTMLAttributes<HTMLButtonElement>)} />;
    }
    return <div className={classes} {...(props as HTMLAttributes<HTMLDivElement>)} />;
}

ListGroup.Item = ListGroupItem;

export default ListGroup;
