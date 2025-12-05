import React, { ReactNode, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/context/authContext";

interface ApiState {
    sendJsonRequest(path: string, method: string, body?: any, options?: any, isMultipart?: boolean): Promise<any>;
}

type QueryOptions = { method: string; headers?: any; body?: any; signal?: AbortSignal; accessToken?: string; deviceId?: string; };

const ApiContext = React.createContext<ApiState>({} as ApiState);

export const useApi = (() => useContext(ApiContext));

interface ApiProviderProps {
    baseUrl: string;
    children: ReactNode;
}

const ApiProvider = ({ baseUrl, children }: ApiProviderProps) => {
    const navigate = useNavigate();
    const { authenticate, accessToken, expiresIn, deviceId } = useAuth();

    const fetchQuery = async (path: string, options: QueryOptions, isMultipart: boolean = false) => {
        const headers = options.headers ?? {};
        let body;
        if (isMultipart) {
            body = new FormData();
            if (options.body) {
                for (let k in options.body) {
                    body.append(k, options.body[k]);
                }
            }
        } else {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(options.body);
        }
        if (options.accessToken) {
            headers["Authorization"] = "Bearer " + options.accessToken;
        }
        if (options.deviceId) {
            headers["X-Device-Id"] = options.deviceId;
        }
        return await fetch(baseUrl + path, {
            method: options.method,
            credentials: "include",
            mode: "cors",
            headers,
            body: options.method != "GET" ? body : undefined,
            signal: options.signal
        });
    }

    const fetchQueryWithReauthentication = async (path: string, options: QueryOptions, isMultipart: boolean = false) => {
        if (!path.startsWith("/Auth") && options.accessToken && expiresIn <= Date.now()) {
            const reauthResult = await reauthenticate();
            options.accessToken = reauthResult.accessToken ?? undefined;
            if (!options.accessToken) {
                navigate("/Users/Login?returnUrl=" + location.pathname, { replace: true });
            }
        }

        return await fetchQuery(path, {
            ...options
        }, isMultipart);

    }

    const reauthenticate = async (): Promise<any> => {
        try {
            const response = await fetchQuery("/Auth/Refresh", {
                method: "POST",
                headers: {
                    "X-Device-Id": deviceId
                }
            });
            const result = await response.json();
            if (result && result.accessToken && result.expiresIn) {
                authenticate(result.accessToken, result.expiresIn);
                return result;
            }
        } catch {

        }

        authenticate(null);
        return null;
    }

    const sendJsonRequest = async (path: string, method: string, body: any = {}, options: any = {}, isMultipart: boolean = false) => {
        try {
            const response = await fetchQueryWithReauthentication(path, {
                method,
                body,
                accessToken,
                deviceId,
                ...options
            }, isMultipart);

            const data = await response.json();

            return data;
        } catch {
            return null;
        }
    }

    const value: ApiState = {
        sendJsonRequest
    };

    return (
        <ApiContext.Provider value={value}>
            {children}
        </ApiContext.Provider>
    );
}

export default ApiProvider;