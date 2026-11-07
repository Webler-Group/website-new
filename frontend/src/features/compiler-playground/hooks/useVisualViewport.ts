import { CSSProperties, useEffect, useState } from "react";

interface ViewportBox {
    height: number;
    offsetTop: number;
}

const readViewport = (): ViewportBox | null => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    // Ignore pinch-zoom; only track size changes like the on-screen keyboard
    if (!vv || Math.abs(vv.scale - 1) > 0.01) return null;
    return { height: Math.round(vv.height), offsetTop: Math.round(vv.offsetTop) };
};

/**
 * Tracks the visual viewport (the part of the screen actually visible).
 * On mobile the virtual keyboard shrinks the visual viewport, but on many browsers
 * not the layout viewport (100vh / 100dvh), so full-height layouts end up under the keyboard.
 *
 * Returns style for a `position: fixed` full-screen container plus the
 * `--wb-viewport-height` CSS variable descendants can use in calc().
 */
const useVisualViewport = () => {
    const [viewport, setViewport] = useState<ViewportBox | null>(readViewport);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        let frame = 0;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const next = readViewport();
                setViewport(prev =>
                    prev?.height === next?.height && prev?.offsetTop === next?.offsetTop ? prev : next
                );
            });
        };

        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);
        update();
        return () => {
            cancelAnimationFrame(frame);
            vv.removeEventListener("resize", update);
            vv.removeEventListener("scroll", update);
        };
    }, []);

    const containerStyle = (viewport
        ? { top: viewport.offsetTop, height: viewport.height, "--wb-viewport-height": `${viewport.height}px` }
        : {}) as CSSProperties;

    return { viewport, containerStyle };
};

export default useVisualViewport;
