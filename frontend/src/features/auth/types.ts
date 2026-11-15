import RolesEnum from "@shared/data/RolesEnum";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    roles: RolesEnum[];
    emailVerified: boolean;
    active: boolean;
    countryCode: string | null;
    registerDate: string;
    level: number;
    xp: number;
}

export interface LoginSuccessData {
    verificationRequired: false;
    accessToken: string;
    expiresIn: number;
    user: AuthUser;
}

export interface LoginVerificationData {
    verificationRequired: true;
    verificationId: string;
    expiresAt: number;
}

export type LoginData = LoginSuccessData | LoginVerificationData;

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