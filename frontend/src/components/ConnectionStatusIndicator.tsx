import { useEffect, useRef, useState } from "react";
import { useConnectionStatus } from "../context/connectionStatus";

const BACK_ONLINE_VISIBLE_MS = 2500;

/** Small global pill showing when the client is offline, and briefly when it comes back online */
const ConnectionStatusIndicator = () => {
    const { online, browserOnline } = useConnectionStatus();
    const [showBackOnline, setShowBackOnline] = useState(false);
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        if (!online) {
            wasOfflineRef.current = true;
            setShowBackOnline(false);
            return;
        }
        if (wasOfflineRef.current) {
            wasOfflineRef.current = false;
            setShowBackOnline(true);
            const timer = setTimeout(() => setShowBackOnline(false), BACK_ONLINE_VISIBLE_MS);
            return () => clearTimeout(timer);
        }
    }, [online]);

    if (online && !showBackOnline) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={"position-fixed start-50 translate-middle-x rounded-pill px-3 py-1 small text-white shadow " + (online ? "bg-success" : "bg-danger")}
            style={{ bottom: "12px", zIndex: 2000, pointerEvents: "none" }}
        >
            {online
                ? "Back online"
                : browserOnline ? "Connection to server lost, reconnecting..." : "You are offline"}
        </div>
    );
};

export default ConnectionStatusIndicator;
