export interface Tag {
    id: string;
    name: string;
}

export interface TagListData {
    tags: Tag[];
}

export interface GetTagData {
    tag: Tag;
}