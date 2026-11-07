import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Asks the user before leaving the page while there are unsaved changes:
 * - closing / reloading the tab or leaving the site -> native "beforeunload" prompt
 * - in-app navigation (links, back/forward) -> returned `blocker` is "blocked", render your own confirm dialog
 */
const useUnsavedChangesGuard = (hasUnsavedChanges: boolean) => {
    const dirtyRef = useRef(hasUnsavedChanges);
    dirtyRef.current = hasUnsavedChanges;
    const skipRef = useRef(false);

    const blocker = useBlocker(({ currentLocation, nextLocation }) =>
        dirtyRef.current &&
        !skipRef.current &&
        currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Legacy browsers require returnValue to be set
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    /** Call right before a programmatic navigation that should not be blocked (e.g. after save / delete) */
    const allowNextNavigation = useCallback(() => {
        skipRef.current = true;
        setTimeout(() => { skipRef.current = false; });
    }, []);

    return { blocker, allowNextNavigation };
};

export default useUnsavedChangesGuard;
