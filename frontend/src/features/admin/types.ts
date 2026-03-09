import RolesEnum from "../../data/RolesEnum";

export interface Ban {
    author: string;
    note?: string;
    date: string;
}

export interface AdminUser {
    id: string;
    email: string;
    countryCode: string | null;
    name: string;
    avatarUrl: string | null;
    roles: RolesEnum[];
    bio?: string;
    registerDate: string;
    level: number;
    verified: boolean;
    active: boolean
    ban: Ban | null;
}

export interface AdminUserListData {
    users: AdminUser[];
    count: number;
}

export interface GetAdminUserData {
    user: AdminUser;
}

export interface BanUserData {
    active: boolean;
    ban: Ban | null;
}

export interface UpdateRolesData {
    roles: RolesEnum[];
}