import { Ref, RefCallback, useEffect, useId, useRef } from "react";

export type Variant =
    | "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark" | "link";

/** "subtle" is a theme-aware light button (see .wb-ui-button--subtle), unlike "light" which stays light in dark mode */
export type ButtonVariant = Variant | `outline-${Exclude<Variant, "link">}` | "subtle";

/** Bootstrap theme-aware surface / text colors usable as bg / text of badges and cards */
export type ThemeColor = "body" | "body-secondary" | "body-tertiary" | "body-emphasis";

export type Size = "sm" | "lg";

/** Joins truthy class names into a single className string. */
export function cx(...classes: (string | false | null | undefined | 0)[]): string {
    return classes.filter(Boolean).join(" ");
}

type CssVarValue = string | number | null | undefined;

/**
 * Ref callback that writes CSS custom properties onto an element.
 * Used for values that can only be known at runtime (coordinates, measured heights, percentages),
 * so the styling itself stays in CSS classes: `.wb-foo { top: var(--wb-foo-top); }`.
 */
export function cssVars<T extends HTMLElement>(vars: Record<`--${string}`, CssVarValue>): RefCallback<T> {
    return (el: T | null) => {
        if (!el) return;
        for (const [name, value] of Object.entries(vars)) {
            if (value === null || value === undefined) {
                el.style.removeProperty(name);
            } else {
                el.style.setProperty(name, typeof value === "number" ? `${value}px` : value);
            }
        }
    };
}

/** Combines multiple refs into one ref callback. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
    return (value: T | null) => {
        for (const ref of refs) {
            if (!ref) continue;
            if (typeof ref === "function") {
                ref(value);
            } else {
                (ref as { current: T | null }).current = value;
            }
        }
    };
}

/* ---------------------------------------------------------------------------------------------
 * Overlay stack: keeps track of open modals / offcanvases so that only the topmost one reacts to
 * the Escape key and the body scroll stays locked while at least one overlay is open.
 * ------------------------------------------------------------------------------------------- */

const overlayStack: string[] = [];

function syncBodyLock() {
    document.body.classList.toggle("modal-open", overlayStack.length > 0);
    document.body.classList.toggle("wb-ui-body--locked", overlayStack.length > 0);
}

export function useOverlay(active: boolean, onEscape?: () => void) {
    const id = useId();
    const onEscapeRef = useRef(onEscape);
    onEscapeRef.current = onEscape;

    useEffect(() => {
        if (!active) return;

        overlayStack.push(id);
        syncBodyLock();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (overlayStack[overlayStack.length - 1] !== id) return;
            onEscapeRef.current?.();
        };
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            const idx = overlayStack.lastIndexOf(id);
            if (idx !== -1) overlayStack.splice(idx, 1);
            syncBodyLock();
        };
    }, [active, id]);
}

/** Invokes `handler` on pointer down outside of every element in `refs`. */
export function useClickOutside(
    refs: React.RefObject<HTMLElement | null>[],
    active: boolean,
    handler: (e: MouseEvent | TouchEvent) => void
) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!active) return;
        const listener = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (refs.some(ref => ref.current?.contains(target))) return;
            handlerRef.current(e);
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);
}
