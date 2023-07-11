import UserConversation from "./UserConversation";

class User {

    uid: string;

    username: string;

    usernameLowercase: string;

    bio: string;

    country: string;

    avatarUrl: string;

    conversations: UserConversation[];

    activeConversationId: string | null;

    constructor(uid: string, username: string) {
        this.uid = uid;
        this.username = username;
        this.usernameLowercase = username.toLowerCase();
        this.bio = "Member of Webler";
        this.country = "";
        this.avatarUrl = "";
        this.conversations = [];
        this.activeConversationId = null
    }
}

export default User;