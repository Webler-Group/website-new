import UserConversation from "../../../account-profile/views/UserConversation";

class ConversationInvite {
    id: string;
    inviterId: string;
    conversation: UserConversation;
    constructor(id: string, conversation: UserConversation, inviterId: string) {
        this.id = id;
        this.conversation = conversation;
        this.inviterId = inviterId;
    }
}

export default ConversationInvite