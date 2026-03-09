import RolesEnum from "../../data/RolesEnum";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    roles: RolesEnum[];
    emailVerified: boolean;
    countryCode: string | null;
    registerDate: string;
    level: number;
    xp: number;
}

export interface LoginData {
    accessToken: string;
    expiresIn: number;
    user: AuthUser;
}

export interface RegisterData {
    accessToken: string;
    expiresIn: number;
    user: AuthUser;
}

export interface RefreshData {
    accessToken: string;
    expiresIn: number;
}

export interface Captcha {
    captchaId: string;
    imageData: string;
}