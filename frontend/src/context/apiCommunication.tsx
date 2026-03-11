import React, { ReactNode, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/context/authContext";
import { RefreshData } from "../features/auth/types";

const EXPIRY_BUFFER_MS = 30_000;

export interface JsonResponse<T> {
    success: boolean;
    data?: T;
    error?: { message: string }[];
}

interface ApiState {
    sendJsonRequest<T>(path: string, method: string, body?: any, options?: any, isMultipart?: boolean): Promise<JsonResponse<T>>;
}

type QueryOptions = {
    method: string;
    headers?: Record<string, string>;
    body?: any;
    signal?: AbortSignal;
    accessToken?: string;
    deviceId?: string;
};

const ApiContext = React.createContext<ApiState>({} as ApiState);

export const useApi = () => useContext(ApiContext);

interface ApiProviderProps {
    baseUrl: string;
    children: ReactNode;
}

const ApiProvider = ({ baseUrl, children }: ApiProviderProps) => {
    const navigate = useNavigate();
    const { authenticate, logout, accessToken, tokenExpiresAt, deviceId } = useAuth();

    const refreshPromiseRef = useRef<Promise<JsonResponse<RefreshData> | null> | null>(null);

    const fetchQuery = async (
        path: string,
        options: QueryOptions,
        isMultipart: boolean = false
    ): Promise<Response> => {
        const headers: Record<string, string> = { ...options.headers };
        let body: BodyInit | undefined;

        if (options.method !== "GET") {
            if (isMultipart) {
                const formData = new FormData();
                if (options.body) {
                    for (const k in options.body) {
                        formData.append(k, options.body[k]);
                    }
                }
                body = formData;
            } else {
                headers["Content-Type"] = "application/json";
                body = JSON.stringify(options.body);
            }
        }

        if (options.accessToken) {
            headers["Authorization"] = "Bearer " + options.accessToken;
        }
        if (options.deviceId) {
            headers["X-Device-Id"] = options.deviceId;
        }

        return fetch(baseUrl + path, {
            method: options.method,
            credentials: "include",
            mode: "cors",
            headers,
            body,
            signal: options.signal,
        });
    };

    const reauthenticate = async (): Promise<JsonResponse<RefreshData> | null> => {
        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        refreshPromiseRef.current = (async () => {
            try {
                const response = await fetchQuery("/Auth/Refresh", {
                    method: "POST",
                    headers: { "X-Device-Id": deviceId },
                });
                const result: JsonResponse<RefreshData> = await response.json();
                if (result.data) {
                    authenticate(result.data.accessToken, result.data.expiresIn);
                    return result;
                }
                logout();
                return null;
            } catch {
                logout();
                return null;
            } finally {
                refreshPromiseRef.current = null;
            }
        })();

        return refreshPromiseRef.current;
    };

    const sendJsonRequest = async function <T>(
        path: string,
        method: string,
        body: any = {},
        options: any = {},
        isMultipart: boolean = false
    ): Promise<JsonResponse<T>> {
        try {
            let currentAccessToken = accessToken;

            if (!path.startsWith("/Auth") && tokenExpiresAt - EXPIRY_BUFFER_MS <= Date.now()) {
                const result = await reauthenticate();
                if (result?.data) {
                    currentAccessToken = result.data.accessToken;
                } else {
                    navigate("/Users/Login?returnUrl=" + location.pathname, { replace: true });
                    return { success: false, error: [{ message: "Session expired" }] };
                }
            }

            const response = await fetchQuery(
                path,
                { method, body, accessToken: currentAccessToken, deviceId, ...options },
                isMultipart
            );

            return await response.json() as JsonResponse<T>;
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unexpected error occurred";
            return { success: false, error: [{ message }] };
        }
    };

    return (
        <ApiContext.Provider value={{ sendJsonRequest }}>
            {children}
        </ApiContext.Provider>
    );
};

export default ApiProvider; 