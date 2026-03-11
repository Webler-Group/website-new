import React, { ReactNode, useContext, useState } from "react";
import { uuid } from "../../../utils/StringUtils";
import { AuthUser } from "../types";

export type UserInfo = AuthUser;

interface AuthState {
    userInfo: UserInfo | null;
    accessToken: string | null;
    tokenExpiresAt: number; // ms timestamp, compare directly with Date.now()
    deviceId: string;
    authenticate: (accessToken: string, expiresAtSeconds: number) => void;
    updateUser: (userInfo: UserInfo) => void;
    logout: () => void;
}

const AuthContext = React.createContext<AuthState>({} as AuthState);

interface AuthProviderProps {
    children: ReactNode;
}

export const useAuth = () => useContext(AuthContext);

const getOrCreateDeviceId = (): string => {
    let id = localStorage.getItem("deviceId");
    if (!id) {
        id = uuid();
        localStorage.setItem("deviceId", id);
    }
    return id;
};

const AuthProvider = ({ children }: AuthProviderProps) => {
    const [accessToken, setAccessToken] = useState(
        localStorage.getItem("accessToken") ?? null
    );

    const [tokenExpiresAt, setTokenExpiresAt] = useState(
        localStorage.getItem("tokenExpiresAt")
            ? Number(localStorage.getItem("tokenExpiresAt"))
            : 0
    );

    const deviceId = getOrCreateDeviceId();

    const defaultUserInfo =
        accessToken && localStorage.getItem("userInfo")
            ? (JSON.parse(localStorage.getItem("userInfo") as string) as UserInfo)
            : null;

    const [userInfo, setUserInfo] = useState(defaultUserInfo);

    const authenticate = (accessTokenValue: string, expiresAtMs: number) => {
        setAccessToken(accessTokenValue);
        localStorage.setItem("accessToken", accessTokenValue);
        setTokenExpiresAt(expiresAtMs);
        localStorage.setItem("tokenExpiresAt", expiresAtMs.toString());
    };

    const logout = () => {
        setAccessToken(null);
        localStorage.removeItem("accessToken");
        setTokenExpiresAt(0);
        localStorage.removeItem("tokenExpiresAt");
        setUserInfo(null);
        localStorage.removeItem("userInfo");
    };

    const updateUser = (userInfo: UserInfo) => {
        setUserInfo(userInfo);
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
    };

    const value: AuthState = {
        userInfo,
        accessToken,
        tokenExpiresAt,
        deviceId,
        authenticate,
        updateUser,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;