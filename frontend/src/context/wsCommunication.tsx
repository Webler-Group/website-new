import React, { ReactNode, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { useApi } from "./apiCommunication";

interface WSState {

}

const WSContext = React.createContext({} as WSState);

export const useWS = (() => useContext(WSContext));

interface WSProviderProps {
    children: ReactNode;
}

const WSProvider = ({ children }: WSProviderProps) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { sendJsonRequest } = useApi();

    useEffect(() => {
        
    }, []);

    const getConnectionInfo = async () => {

    }

    const value: WSState = {

    };

    return (
        <WSContext.Provider value={value}>
            {children}
        </WSContext.Provider>
    );
}

export default WSProvider;