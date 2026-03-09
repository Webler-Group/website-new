import FileTypeEnum from "../../data/FileTypeEnum";
import { UserMinimal } from "../../features/profile/types";

export interface FileEntry {
    id: string;
    author: UserMinimal;
    type: FileTypeEnum;
    name: string;
    mimetype?: string;
    size?: number;
    updatedAt: string;
    url?: string | null;
    previewUrl?: string | null;
};

export interface FileEntriesData {
    items: FileEntry[];
};

export interface UploadImageFileData {
    id: string;
    name: string;
    mimetype?: string;
    size?: number;
    updatedAt: string;
    url: string | null;
    previewUrl: string | null;
};

export interface CreateFolderData {
    id: string;
    name: string;
    updatedAt: string;
}