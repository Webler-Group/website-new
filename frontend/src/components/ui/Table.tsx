import { TableHTMLAttributes } from "react";
import { cx } from "./utils";

interface TableProps extends Omit<TableHTMLAttributes<HTMLTableElement>, "style"> {
    striped?: boolean;
    bordered?: boolean;
    hover?: boolean;
    size?: "sm";
    responsive?: boolean;
}

function Table({ striped, bordered, hover, size, responsive, className, ...props }: TableProps) {
    const table = (
        <table
            className={cx(
                "table",
                striped && "table-striped",
                bordered && "table-bordered",
                hover && "table-hover",
                size && `table-${size}`,
                className
            )}
            {...props}
        />
    );
    return responsive ? <div className="table-responsive">{table}</div> : table;
}

export default Table;
