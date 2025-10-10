import React, { ReactNode, useContext, useState } from "react";

export interface UserInfo {
    id: string;
    name: string;
    email: string;
    avatarImage: string | null;
    roles: string[];
    emailVerified: boolean;
    countryCode: string | null;
    registerDate: number;
    level: number;
    xp: number;
}

interface AuthState {
    userInfo: UserInfo | null;
    accessToken: string | null;
    expiresIn: number;
    deviceId: string;
    authenticate: (accessToken: string | null, expiresIn?: number) => void;
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
        if (typeof crypto?.randomUUID === "function") {
            id = crypto.randomUUID();
        } else {
            id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        }
        localStorage.setItem("deviceId", id);
    }
    return id;
};

const AuthProvider = ({ children }: AuthProviderProps) => {
    const [accessToken, setAccessToken] = useState(
        localStorage.getItem("accessToken") ?? null
    );

    const [expiresIn, setExpiresIn] = useState(
        localStorage.getItem("expiresIn")
            ? Number(localStorage.getItem("expiresIn"))
            : 0
    );

    const deviceId = getOrCreateDeviceId();

    const defaultUserInfo =
        accessToken && localStorage.getItem("userInfo")
            ? (JSON.parse(localStorage.getItem("userInfo") as string) as UserInfo)
            : null;

    const [userInfo, setUserInfo] = useState(defaultUserInfo);

    const authenticate = (accessTokenValue: string | null, expiresInValue: number = 0) => {
        if (accessTokenValue) {
            setAccessToken(accessTokenValue);
            localStorage.setItem("accessToken", accessTokenValue);
            setExpiresIn(expiresInValue);
            localStorage.setItem("expiresIn", expiresInValue.toString());
        } else {
            setAccessToken(null);
            localStorage.removeItem("accessToken");
            setExpiresIn(0);
            localStorage.removeItem("expiresIn");
            setUserInfo(null);
            localStorage.removeItem("userInfo");
        }
    };

    const updateUser = (userInfo: UserInfo) => {
        setUserInfo(userInfo);
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
    };

    const logout = () => {
        authenticate(null);
    };

    const value: AuthState = {
        userInfo,
        accessToken,
        expiresIn,
        deviceId,
        authenticate,
        updateUser,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
