import { HTMLAttributes } from "react";
import { cx } from "./utils";

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, "style">;
type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

const breakpoints: Breakpoint[] = ["xs", "sm", "md", "lg", "xl", "xxl"];

function infix(bp: Breakpoint) {
    return bp === "xs" ? "" : `-${bp}`;
}

interface ContainerProps extends DivProps {
    fluid?: boolean | Exclude<Breakpoint, "xs">;
}

export function Container({ fluid, className, ...props }: ContainerProps) {
    const base = fluid === true ? "container-fluid" : fluid ? `container-${fluid}` : "container";
    return <div className={cx(base, className)} {...props} />;
}

type RowCols = number | `${number}` | "auto";

type RowProps = DivProps & Partial<Record<Breakpoint, RowCols>>;

/** `xs`/`sm`/... set the number of columns per row (Bootstrap `row-cols-*`). */
export function Row({ className, ...props }: RowProps) {
    const colClasses: string[] = [];
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
        if (breakpoints.includes(key as Breakpoint)) {
            if (value !== undefined) colClasses.push(`row-cols${infix(key as Breakpoint)}-${value}`);
        } else {
            rest[key] = value;
        }
    }
    return <div className={cx("row", ...colClasses, className)} {...(rest as DivProps)} />;
}

type ColSpan = boolean | number | `${number}` | "auto";

type ColProps = DivProps & Partial<Record<Breakpoint, ColSpan>>;

/** `xs`/`sm`/... set the column span at that breakpoint (`true` = equal width). */
export function Col({ className, ...props }: ColProps) {
    const spanClasses: string[] = [];
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
        if (breakpoints.includes(key as Breakpoint)) {
            if (value === true) spanClasses.push(`col${infix(key as Breakpoint)}`);
            else if (value !== undefined && value !== false) spanClasses.push(`col${infix(key as Breakpoint)}-${value}`);
        } else {
            rest[key] = value;
        }
    }
    return <div className={cx(spanClasses.length ? spanClasses.join(" ") : "col", className)} {...(rest as DivProps)} />;
}
