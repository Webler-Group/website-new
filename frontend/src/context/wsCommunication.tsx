import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../features/auth/context/authContext";

interface WSState {
    socket: Socket | null;
    connected: boolean;
}

const WSContext = createContext<WSState>({} as WSState);

export const useWS = () => useContext(WSContext);

interface WSProviderProps {
    children: React.ReactNode;
}

const WSProvider = ({ children }: WSProviderProps) => {
    const { accessToken, deviceId } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {

        const newSocket = io({
            auth: {
                token: accessToken,
                deviceId
            },
        });

        setSocket(newSocket);

        newSocket.on("connect", () => {
            setConnected(true);
        });

        newSocket.on("disconnect", () => {
            setConnected(false);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [accessToken]);

    const value: WSState = {
        socket,
        connected
    };

    return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
};

export default WSProvider;
