import React, { createContext, useContext, useEffect, useState } from "react";
import { useWS } from "./wsCommunication";

interface ConnectionStatusState {
    /** Browser reports network access AND the server (socket) is reachable */
    online: boolean;
    /** navigator.onLine — the device has some network connection */
    browserOnline: boolean;
    /** the realtime connection to the server is up (or not known to be down yet) */
    serverReachable: boolean;
}

const ConnectionStatusContext = createContext<ConnectionStatusState>({
    online: true,
    browserOnline: true,
    serverReachable: true
});

export const useConnectionStatus = () => useContext(ConnectionStatusContext);

interface ConnectionStatusProviderProps {
    children: React.ReactNode;
}

const ConnectionStatusProvider = ({ children }: ConnectionStatusProviderProps) => {
    const { socket } = useWS();
    const [browserOnline, setBrowserOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
    const [serverReachable, setServerReachable] = useState(true);

    useEffect(() => {
        const handleOnline = () => setBrowserOnline(true);
        const handleOffline = () => setBrowserOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => setServerReachable(true);
        const handleConnectError = () => setServerReachable(false);
        const handleDisconnect = (reason: string) => {
            // Intentional client-side disconnect (e.g. socket recreated after token refresh) is not a connection loss
            if (reason === "io client disconnect") return;
            setServerReachable(false);
        };

        if (socket.connected) setServerReachable(true);

        socket.on("connect", handleConnect);
        socket.on("connect_error", handleConnectError);
        socket.on("disconnect", handleDisconnect);
        return () => {
            socket.off("connect", handleConnect);
            socket.off("connect_error", handleConnectError);
            socket.off("disconnect", handleDisconnect);
        };
    }, [socket]);

    const value: ConnectionStatusState = {
        online: browserOnline && serverReachable,
        browserOnline,
        serverReachable
    };

    return <ConnectionStatusContext.Provider value={value}>{children}</ConnectionStatusContext.Provider>;
};

export default ConnectionStatusProvider;
