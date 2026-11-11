import {
    ComponentProps,
    createContext,
    ElementType,
    HTMLAttributes,
    MouseEvent,
    ReactNode,
    RefObject,
    useContext,
    useRef,
    useState
} from "react";
import { Link } from "react-router-dom";
import Button from "./Button";
import { ButtonVariant, cx, Size, useClickOutside } from "./utils";

type Breakpoint = "sm" | "md" | "lg" | "xl" | "xxl";
type Align = "start" | "end" | Partial<Record<Breakpoint, "start" | "end">>;

interface DropdownContextValue {
    show: boolean;
    setShow: (next: boolean) => void;
    autoClose: boolean | "inside" | "outside";
    align?: Align;
    toggleRef: RefObject<HTMLElement | null>;
    menuRef: RefObject<HTMLDivElement | null>;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown() {
    const ctx = useContext(DropdownContext);
    if (!ctx) throw new Error("Dropdown subcomponents must be rendered inside <Dropdown>");
    return ctx;
}

interface DropdownProps extends Omit<HTMLAttributes<HTMLDivElement>, "style" | "onToggle"> {
    show?: boolean;
    onToggle?: (nextShow: boolean) => void;
    drop?: "up" | "down" | "start" | "end";
    align?: Align;
    autoClose?: boolean | "inside" | "outside";
    as?: ElementType;
    children?: ReactNode;
}

const dropClass = { up: "dropup", down: "dropdown", start: "dropstart", end: "dropend" };

/** Bootstrap dropdown with React-managed state; menus use Bootstrap's static `[data-bs-popper]` positioning. */
function Dropdown({
    show: controlledShow,
    onToggle,
    drop = "down",
    align,
    autoClose = true,
    as: Component = "div",
    className,
    children,
    ...props
}: DropdownProps) {
    const [uncontrolledShow, setUncontrolledShow] = useState(false);
    const show = controlledShow ?? uncontrolledShow;
    const toggleRef = useRef<HTMLElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const setShow = (next: boolean) => {
        if (controlledShow === undefined) setUncontrolledShow(next);
        onToggle?.(next);
    };

    useClickOutside([toggleRef, menuRef], show && (autoClose === true || autoClose === "outside"), () => setShow(false));

    return (
        <DropdownContext.Provider value={{ show, setShow, autoClose, align, toggleRef, menuRef }}>
            <Component className={cx(dropClass[drop], className)} {...props}>
                {children}
            </Component>
        </DropdownContext.Provider>
    );
}

interface DropdownToggleProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
    as?: ElementType;
    variant?: ButtonVariant;
    size?: Size;
    disabled?: boolean;
}

function DropdownToggle({ as, variant = "primary", size, className, onClick, children, ...props }: DropdownToggleProps) {
    const { show, setShow, toggleRef } = useDropdown();

    const handleClick = (e: MouseEvent<HTMLElement>) => {
        onClick?.(e);
        setShow(!show);
    };

    if (as) {
        const Component = as;
        return (
            <Component ref={toggleRef} className={className} aria-expanded={show} onClick={handleClick} {...props}>
                {children}
            </Component>
        );
    }

    return (
        <Button
            ref={toggleRef as RefObject<HTMLButtonElement>}
            variant={variant}
            size={size}
            className={cx("dropdown-toggle", show && "show", className)}
            aria-expanded={show}
            onClick={handleClick}
            {...props}
        >
            {children}
        </Button>
    );
}

function alignClasses(align?: Align) {
    if (!align) return undefined;
    if (typeof align === "string") return align === "end" ? "dropdown-menu-end" : undefined;
    // Responsive alignment: default to end, switch at the given breakpoints
    return cx("dropdown-menu-end", ...Object.entries(align).map(([bp, dir]) => `dropdown-menu-${bp}-${dir}`));
}

interface DropdownMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    align?: Align;
}

function DropdownMenu({ align: menuAlign, className, onClick, children, ...props }: DropdownMenuProps) {
    const { show, setShow, autoClose, align, menuRef } = useDropdown();

    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
        const target = e.target as HTMLElement;
        if ((autoClose === true || autoClose === "inside") && target.closest(".dropdown-item")) {
            setShow(false);
        }
    };

    return (
        <div
            ref={menuRef}
            data-bs-popper="static"
            className={cx("dropdown-menu", alignClasses(menuAlign ?? align), show && "show", className)}
            onClick={handleClick}
            {...props}
        >
            {children}
        </div>
    );
}

type DropdownItemProps =
    | ({ as?: undefined; to?: undefined } & Omit<ComponentProps<"button">, "style">)
    | ({ as: typeof Link; to: string } & Omit<ComponentProps<typeof Link>, "style">)
    | ({ as: "a"; href?: string } & Omit<ComponentProps<"a">, "style">);

function DropdownItem({ className, ...props }: DropdownItemProps & { active?: boolean }) {
    const { active, ...rest } = props as DropdownItemProps & { active?: boolean };
    const classes = cx("dropdown-item", active && "active", className);

    if (rest.as === Link) {
        const { as: _as, ...linkProps } = rest;
        return <Link className={classes} {...linkProps} />;
    }
    if (rest.as === "a") {
        const { as: _as, ...anchorProps } = rest;
        return <a className={classes} {...anchorProps} />;
    }
    const { as: _as, ...buttonProps } = rest as { as?: undefined } & ComponentProps<"button">;
    return <button type="button" className={classes} {...buttonProps} />;
}

function DropdownItemText({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return <span className={cx("dropdown-item-text", className)} {...props} />;
}

function DropdownDivider({ className }: { className?: string }) {
    return <hr className={cx("dropdown-divider", className)} />;
}

function DropdownHeader({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h6 className={cx("dropdown-header", className)} {...props} />;
}

Dropdown.Toggle = DropdownToggle;
Dropdown.Menu = DropdownMenu;
Dropdown.Item = DropdownItem;
Dropdown.ItemText = DropdownItemText;
Dropdown.Divider = DropdownDivider;
Dropdown.Header = DropdownHeader;

export default Dropdown;
