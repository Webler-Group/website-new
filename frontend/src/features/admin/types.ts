import RolesEnum from "../../data/RolesEnum";

export interface Ban {
    author: string;
    note?: string;
    date: string;
}

export interface IpRecord {
    id: string;
    value: string;
    banned: boolean;
    description?: string;
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
    lastLoginDate?: string;
    level: number;
    verified: boolean;
    active: boolean
    ban: Ban | null;
    ips: IpRecord[];
    lastIp?: IpRecord;
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

export interface DeleteUserFilesData {
    deletedCount: number;
}

export interface ToggleBanIpData {
    id: string;
    banned: boolean;
}

export interface IpListData {
    ips: IpRecord[];
    count: number;
}

export interface CreateIpData {
    id: string;
    value: string;
    banned: boolean;
}