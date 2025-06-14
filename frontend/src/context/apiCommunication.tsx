import React, { ReactNode, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/context/authContext";

interface ApiState {
    sendJsonRequest(path: string, method: string, body?: any, options?: any, isMultipart?: boolean): Promise<any>;
}

const ApiContext = React.createContext<ApiState>({} as ApiState);

export const useApi = (() => useContext(ApiContext));

interface ApiProviderProps {
    baseUrl: string;
    children: ReactNode;
}

const ApiProvider = ({ baseUrl, children }: ApiProviderProps) => {
    const navigate = useNavigate();
    const { authenticate, accessToken, expiresIn } = useAuth();

    const fetchQuery = async (path: string, options: { method: string; headers?: any; body?: any; signal?: AbortSignal; accessToken?: string; }, isMultipart: boolean = false) => {
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
        return await fetch(baseUrl + path, {
            method: options.method,
            credentials: "include",
            mode: "cors",
            headers: {
                ...headers,
                "Authorization": options.accessToken ? "Bearer " + options.accessToken : undefined
            },
            body: options.method != "GET" ? body : undefined,
            signal: options.signal
        });
    }

    const fetchQueryWithReauthentication = async (path: string, options: { method: string; body?: any; signal?: AbortSignal; accessToken?: string; }, isMultipart: boolean = false) => {
        // console.log(path, expiresIn Date.now());
        if (!path.startsWith("/Auth") && options.accessToken && expiresIn <= Date.now()) {
            options.accessToken = (await reauthenticate()) ?? undefined;
            if (!options.accessToken) {
                navigate("/Users/Login?returnUrl=" + location.pathname, { replace: true });
            }
        }

        return await fetchQuery(path, {
            ...options
        }, isMultipart);

    }

    const reauthenticate = async (): Promise<string | null> => {
        const result = await fetchQuery("/Auth/Refresh", {
            method: "POST"
        })
            .then(response => response.json());
        if (result && result.accessToken && result.expiresIn) {
            authenticate(result.accessToken, result.expiresIn);
            return result.accessToken;
        }

        authenticate(null, 0);
        return null;
    }

    const sendJsonRequest = async (path: string, method: string, body: any = {}, options: any = {}, isMultipart: boolean = false) => {
        const response = await fetchQueryWithReauthentication(path, {
            method,
            body,
            accessToken,
            ...options
        }, isMultipart);

        const data = await response.json();

        return data;
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