class Conversation {
    id: string;
    title: string;
    isGroup: boolean;
    participants: string[];
    ownerId: string;
    public: {
        lastMessageTimestamp: number
    };

    constructor(id: string, title: string, isGroup: boolean, ownerId: string) {
        this.id = id;
        this.title = title;
        this.isGroup = isGroup;
        this.ownerId = ownerId;
        this.participants = [];
        this.public = {
            lastMessageTimestamp: 0
        }
    }
}

export default Conversation