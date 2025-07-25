import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../features/auth/context/authContext";

// Define the shape of what you'll provide via context
interface WSState {
    socket: Socket | null;
    connected: boolean;
}

// Create context with default empty object casted to WSState
const WSContext = createContext<WSState>({ socket: null, connected: false });

// Custom hook for consuming the context
export const useWS = () => useContext(WSContext);

// Props type
interface WSProviderProps {
    children: React.ReactNode;
}

const WSProvider = ({ children }: WSProviderProps) => {
    const { accessToken, deviceId } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!accessToken) return;

        const newSocket = io({
            auth: {
                token: accessToken,
                deviceId
            },
        });

        setSocket(newSocket);

        newSocket.on("connect", () => {
            setConnected(true);
            console.log("Socket connected");
        });

        newSocket.on("disconnect", () => {
            setConnected(false);
            console.log("Socket disconnected");
        });

        return () => {
            newSocket.disconnect();
        };
    }, [accessToken]);

    const value = useMemo(() => ({ socket, connected }), [socket, connected]);

    return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
};

export default WSProvider;
