import { ComponentProps, createContext, HTMLAttributes, MouseEvent, useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import Dropdown from "./Dropdown";
import { TabContext } from "./Tabs";
import { cx } from "./utils";

interface NavProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
    variant?: "tabs" | "pills" | "underline";
    fill?: boolean;
    justify?: boolean;
    navbar?: boolean;
}

function Nav({ variant, fill, justify, navbar, className, ...props }: NavProps) {
    const inNavbar = useContext(NavbarContext) !== null;
    return (
        <div
            className={cx(
                (navbar ?? inNavbar) ? "navbar-nav" : "nav",
                variant && `nav-${variant}`,
                fill && "nav-fill",
                justify && "nav-justified",
                className
            )}
            {...props}
        />
    );
}

function NavItem({ className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, "style">) {
    return <div className={cx("nav-item", className)} {...props} />;
}

type NavLinkProps =
    | ({ to: string; eventKey?: undefined; disabled?: boolean } & Omit<ComponentProps<typeof NavLink>, "className" | "style"> & { className?: string })
    | ({ to?: undefined; eventKey?: string; disabled?: boolean; active?: boolean } & Omit<ComponentProps<"button">, "style">);

/**
 * - with `to`: router link, highlighted when its route is active
 * - with `eventKey`: tab selector inside <Tab.Container>
 * - otherwise: plain button styled as nav link
 */
function NavLinkItem(props: NavLinkProps) {
    const tabs = useContext(TabContext);
    const navbar = useContext(NavbarContext);

    if (props.to !== undefined) {
        const { className, disabled, onClick, ...linkProps } = props;
        return (
            <NavLink
                className={({ isActive }) => cx("nav-link", isActive && "active", disabled && "disabled", className)}
                onClick={(e) => {
                    onClick?.(e);
                    navbar?.onSelect();
                }}
                {...linkProps}
            />
        );
    }

    const { eventKey, active, disabled, className, onClick, ...buttonProps } = props;
    const isActive = active ?? (eventKey !== undefined && tabs?.activeKey === eventKey);

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (eventKey !== undefined) tabs?.onSelect(eventKey);
        navbar?.onSelect();
    };

    return (
        <button
            type="button"
            role={eventKey !== undefined ? "tab" : undefined}
            aria-selected={eventKey !== undefined ? isActive : undefined}
            disabled={disabled}
            className={cx("nav-link", isActive && "active", disabled && "disabled", className)}
            onClick={handleClick}
            {...buttonProps}
        />
    );
}

Nav.Item = NavItem;
Nav.Link = NavLinkItem;

/* ---------------------------------------------------------------------------------------------
 * Navbar
 * ------------------------------------------------------------------------------------------- */

interface NavbarContextValue {
    expanded: boolean;
    toggle: () => void;
    /** Collapses the menu after a link was selected (when collapseOnSelect is on) */
    onSelect: () => void;
}

const NavbarContext = createContext<NavbarContextValue | null>(null);

interface NavbarProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
    expand?: "sm" | "md" | "lg" | "xl" | "xxl" | boolean;
    bg?: string;
    variant?: string;
    collapseOnSelect?: boolean;
}

export function Navbar({ expand, bg, variant, collapseOnSelect, className, children, ...props }: NavbarProps) {
    const [expanded, setExpanded] = useState(false);
    const expandClass = expand === true ? "navbar-expand" : expand ? `navbar-expand-${expand}` : undefined;

    return (
        <NavbarContext.Provider
            value={{
                expanded,
                toggle: () => setExpanded(v => !v),
                onSelect: () => collapseOnSelect && setExpanded(false)
            }}
        >
            <nav
                className={cx("navbar", expandClass, bg && `bg-${bg}`, className)}
                data-bs-theme={variant === "dark" ? "dark" : undefined}
                {...props}
            >
                {children}
            </nav>
        </NavbarContext.Provider>
    );
}

function NavbarBrand({ className, ...props }: Omit<HTMLAttributes<HTMLSpanElement>, "style">) {
    return <span className={cx("navbar-brand", className)} {...props} />;
}

function NavbarToggle({ className, ...props }: Omit<ComponentProps<"button">, "style">) {
    const navbar = useContext(NavbarContext);
    return (
        <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={navbar?.expanded}
            className={cx("navbar-toggler", !navbar?.expanded && "collapsed", className)}
            onClick={navbar?.toggle}
            {...props}
        >
            <span className="navbar-toggler-icon" />
        </button>
    );
}

function NavbarCollapse({ className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, "style">) {
    const navbar = useContext(NavbarContext);
    return <div className={cx("navbar-collapse collapse", navbar?.expanded && "show", className)} {...props} />;
}

Navbar.Brand = NavbarBrand;
Navbar.Toggle = NavbarToggle;
Navbar.Collapse = NavbarCollapse;

/* ---------------------------------------------------------------------------------------------
 * NavDropdown – dropdown placed inside a <Nav>
 * ------------------------------------------------------------------------------------------- */

interface NavDropdownProps {
    title: React.ReactNode;
    align?: "start" | "end";
    menuVariant?: "light" | "dark";
    className?: string;
    children?: React.ReactNode;
}

const NavDropdownToggle = ({ className, ...props }: HTMLAttributes<HTMLAnchorElement> & { ref?: React.Ref<HTMLAnchorElement> }) => (
    <a href="#" role="button" className={cx("nav-link dropdown-toggle", className)} {...props} />
);

export function NavDropdown({ title, align, menuVariant, className, children }: NavDropdownProps) {
    const navbar = useContext(NavbarContext);
    return (
        <Dropdown className={cx("nav-item", className)}>
            <Dropdown.Toggle
                as={NavDropdownToggle}
                onClick={(e: MouseEvent) => e.preventDefault()}
            >
                {title}
            </Dropdown.Toggle>
            <Dropdown.Menu
                align={align}
                data-bs-theme={menuVariant === "dark" ? "dark" : undefined}
                onClick={() => navbar?.onSelect()}
            >
                {children}
            </Dropdown.Menu>
        </Dropdown>
    );
}

NavDropdown.Item = Dropdown.Item;
NavDropdown.Divider = Dropdown.Divider;

export default Nav;
