class UserConversation {
    id: string;
    title: string;
    lastReadMessageTimestamp: number;
    lastMessageTimestamp: number;
    ownerId: string;
    isGroup: boolean;
    
    constructor(id: string, title: string, ownerId: string, isGroup: boolean) {
        this.id = id;
        this. title = title;
        this.lastReadMessageTimestamp = 0;
        this.lastMessageTimestamp = 0;
        this.ownerId = ownerId;
        this.isGroup = isGroup;
    }
}

export default UserConversation