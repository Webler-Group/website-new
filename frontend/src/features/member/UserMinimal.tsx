class UserMinimal {
    uid: string;
    username: string;
    avatarUrl: string;

    constructor(uid: string, username: string, avatarUrl: string) {
        this.uid = uid;
        this.username = username;
        this.avatarUrl = avatarUrl;
    }
}

export default UserMinimal