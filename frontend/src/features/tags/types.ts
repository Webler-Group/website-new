export interface Tag {
    id: string;
    name: string;
}

export interface TagListData {
    tags: string[];
}

export interface GetTagData {
    tag: Tag;
}