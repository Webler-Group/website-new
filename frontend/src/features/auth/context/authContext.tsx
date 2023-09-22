import React, { ReactNode, useContext, useState } from "react"
import ApiCommunication from "../../../helpers/apiCommunication";

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
    authenticate: (accessToken: string, expiresIn: number) => void;
    updateUser: (userInfo: UserInfo) => void;
    logout: () => void;
}

const AuthContext = React.createContext<AuthState>({} as AuthState);

interface AuthProviderProps {
    children: ReactNode
}

export const useAuth = () => useContext(AuthContext);

export const authenticate = (accessToken: string | null, expiresIn: number = 0) => {
    ApiCommunication.setAccessToken(accessToken, expiresIn);
    if (accessToken) {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("expiresIn", expiresIn.toString());
    }
    else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("expiresIn");
        localStorage.removeItem("userInfo");
    }
}

export const AuthProvider = ({ children }: AuthProviderProps) => {

    const accessToken = localStorage.getItem("accessToken") ?
        localStorage.getItem("accessToken") :
        null;
    const expiresIn = localStorage.getItem("expiresIn") ?
        Number(localStorage.getItem("expiresIn")) :
        0;
    ApiCommunication.setAccessToken(accessToken, expiresIn);

    const defaultUserInfo = (accessToken && localStorage.getItem("userInfo")) ?
        JSON.parse(localStorage.getItem("userInfo") as string) as UserInfo :
        null;
    const [userInfo, setUserInfo] = useState(defaultUserInfo);

    const updateUser = (userInfo: UserInfo) => {
        setUserInfo(userInfo);

        localStorage.setItem("userInfo", JSON.stringify(userInfo));
    }

    const logout = () => {
        ApiCommunication.setAccessToken(null, 0);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("expiresIn");
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