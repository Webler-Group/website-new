import UserMinimal from "../../../account-profile/views/UserMinimal";

class Message {
    id: string;
    uid: string | null;
    user: UserMinimal | null;
    text: string;
    timestamp: number;

    constructor(id: string, user: UserMinimal | null, text: string, timestamp: number) {
        this.id = id;
        this.uid = user ? user.uid : null;
        this.user = user;
        this.text = text;
        this.timestamp = timestamp;
    }
}

export default Message