import React, { ReactNode, useContext, useState } from "react"
import ApiCommunication from "../../../app/apiCommunication";

interface UserInfo {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    roles: string[];
    emailVerified: boolean;
    countryCode: string | null;
    registerDate: number;
    level: number;
    xp: number;
}

interface AuthState {
    userInfo: UserInfo | null;
    authenticate: (accessToken: string) => void;
    updateUser: (userInfo: UserInfo) => void;
    logout: () => void;
}

const AuthContext = React.createContext<AuthState>({} as AuthState);

interface AuthProviderProps {
    children: ReactNode
}

export const useAuth = () => useContext(AuthContext);

export const authenticate = (accessToken: string) => {
    ApiCommunication.setAccessToken(accessToken);
    localStorage.setItem("accessToken", accessToken);
}

export const AuthProvider = ({ children }: AuthProviderProps) => {

    const accessToken = localStorage.getItem("accessToken") ?
        localStorage.getItem("accessToken") :
        null;
    ApiCommunication.setAccessToken(accessToken);

    const defaultUserInfo = localStorage.getItem("userInfo") ?
        JSON.parse(localStorage.getItem("userInfo") as string) as UserInfo :
        null;
    const [userInfo, setUserInfo] = useState(defaultUserInfo);

    const updateUser = (userInfo: UserInfo) => {
        setUserInfo(userInfo);

        localStorage.setItem("userInfo", JSON.stringify(userInfo));
    }

    const logout = () => {
        ApiCommunication.setAccessToken(null);
        localStorage.removeItem("accessToken");
        setUserInfo(null);
        localStorage.removeItem("userInfo");
    }

    const value: AuthState = {
        userInfo,
        authenticate,
        updateUser,
        logout
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}