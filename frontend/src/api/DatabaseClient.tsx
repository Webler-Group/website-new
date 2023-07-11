import { equalTo, get, orderByChild, ref, set, update, query, DataSnapshot, onValue, limitToLast, endBefore, push, remove, child, onChildAdded, onChildRemoved, startAt } from "firebase/database"
import User from "../pages/account-profile/views/User"
import { db } from "../services/firebase.config"
import UserMinimal from "../pages/account-profile/views/UserMinimal"
import Message from "../pages/social-network/chat/views/Message"
import Conversation from "../pages/social-network/chat/views/Conversation"
import UserConversation from "../pages/account-profile/views/UserConversation"
import ConversationInvite from "../pages/social-network/chat/views/ConversationInvite"

const DatabaseClient = (function() {

    async function createUser(user: User) {
        return await set(ref(db, `users/${user.uid}`), user)
    }

    async function updateUser(uid: string, data: any) {
        await update(ref(db, `users/${uid}`), data)
        const user = (await getUser(uid)).val()
        
        if(user.conversations) {
            let promises = []
            let items: {conversationId: string, messageId: string }[] = []
            for(let conversationId of Object.keys(user.conversations)) {
                const messagesRef = query(ref(db, `messages/${conversationId}`), orderByChild('uid'), equalTo(uid))
                promises.push(get(messagesRef).then(snapshot => {
                    if(snapshot.exists()) {
                        for(let messageId of Object.keys(snapshot.val())) {
                            items.push({ conversationId, messageId })
                        }
                    }
                }))
            }
            await Promise.all(promises)
            promises = []
            for(let item of items) {
                const messageRef = ref(db, `messages/${item.conversationId}/${item.messageId}`)
                promises.push(update(messageRef, {
                    user
                }))
            }
            await Promise.all(promises)
        }
    }

    async function getUser(uid: string) {
        return await get(ref(db, `users/${uid}`))
    }

    async function getUserByUsername(username: string) {
        const userRef = query(ref(db, `users`), orderByChild('usernameLowercase'), equalTo(username.toLowerCase()));
        return await get(userRef)
    }

    function onUserChange(uid: string, callback: (snaphost: DataSnapshot) => unknown) {
        const userRef = ref(db, `users/${uid}`)
        const unsubscribe = onValue(userRef, callback)
        return unsubscribe
    }

    async function getAllUsers() {
        return await get(ref(db, `users`))
    }

    function onUserConversationsChange(uid: string, callback: (snaphost: DataSnapshot) => unknown) {
        const conversationsRef = ref(db, `users/${uid}/conversations`)
        const unsubscribe = onValue(conversationsRef, callback)
        return unsubscribe
    }

    function onNewMessageAdded(conversationId: string, limit: number, timestampFrom: number, callback: (snaphost: DataSnapshot) => unknown) {
        const messagesRef = query(ref(db, `messages/${conversationId}`), orderByChild('timestamp'), startAt(timestampFrom), limitToLast(limit))
        const unsubscribe = onChildAdded(messagesRef, callback)
        return unsubscribe
    }

    function onMessages(conversationId: string, limit: number, callback: (snaphost: DataSnapshot) => unknown) {
        const messagesRef = query(ref(db, `messages/${conversationId}`), orderByChild('timestamp'), limitToLast(limit))
        const unsubscribe = onValue(messagesRef, callback)
        return unsubscribe
    }

    function onMesageRemoved(conversationId: string, callback: (snaphost: DataSnapshot) => unknown) {
        const messagesRef = query(ref(db, `messages/${conversationId}`))
        const unsubscribe = onChildRemoved(messagesRef, callback)
        return unsubscribe
    }

    async function getMessages(conversationId: string, limit: number, timestampTo: number) {
        const messagesRef = query(ref(db, `messages/${conversationId}`), orderByChild('timestamp'), endBefore(timestampTo), limitToLast(limit))
        return await get(messagesRef)
    }

    async function createMessage(conversationId: string, user: UserMinimal | null, text: string) {
        const messagesRef = ref(db, `messages/${conversationId}`);
        const newMessageRef = push(messagesRef)
        const t = Date.now()
        const message = new Message(newMessageRef.key as string, user, text, t)
        await set(newMessageRef, message)
        await update(ref(db, `conversations/${conversationId}/public`), {
            lastMessageTimestamp: t
        })
        return message
    }

    async function createConversation(title: string, ownerId: string, isGroup:boolean = true) {
        const conversationRef = ref(db, `conversations`);
        const newConversationRef = push(conversationRef)
        const conversation = new Conversation(newConversationRef.key as string, title, isGroup, ownerId)
        await set(newConversationRef, conversation)
        return conversation
    }

    function onConversationChange(id: string, callback: (snapshot: DataSnapshot) => unknown) {
        return onValue(ref(db, `conversations/${id}`), callback)
    }

    async function addUserToConversation(conversation: UserConversation, user: UserMinimal) {
        const participantsRef = ref(db, `conversations/${conversation.id}/participants`);
        const newParticipantRef = child(participantsRef, user.uid)

        const userConversationsRef = ref(db, `users/${user.uid}/conversations`);
        const newUserConversationRef = child(userConversationsRef, conversation.id)

        await set(newParticipantRef, user),
        await set(newUserConversationRef, conversation)
    }

    async function removeUserFromConversation(conversationId: string, uid: string) {
        const participantsRef = ref(db, `conversations/${conversationId}/participants`);
        const participantRef = child(participantsRef, uid)

        const userConversationsRef = ref(db, `users/${uid}/conversations`);
        const userConversationRef = child(userConversationsRef, conversationId)

        await remove(userConversationRef)
        await remove(participantRef)
    }

    function onConversationInvitesChange(uid: string, callback: (snaphost: DataSnapshot) => unknown) {
        const conversationInvitesRef = ref(db, `conversationInvites/${uid}`);
        const unsubscribe = onValue(conversationInvitesRef, callback)
        return unsubscribe
    }

    async function createConversationInvite(conversation: UserConversation, invitedId: string, inviterId: string) {
        const conversationInviteRef = ref(db, `conversationInvites/${invitedId}/${conversation.id}`);
        const newConversationInviteRef = child(conversationInviteRef, inviterId)
        const conversationInvite = new ConversationInvite(newConversationInviteRef.key as string, conversation, inviterId)
        await set(newConversationInviteRef, conversationInvite)
        return conversationInvite
    }

    async function deleteAllConversationInvites(invitedId: string, conversationId: string) {
        const conversationInvitesRef = ref(db, `conversationInvites/${invitedId}/${conversationId}`);
        return await remove(conversationInvitesRef)
    }

    async function deleteConversationInvite(invitedId: string, conversationId: string, id: string) {
        const conversationInviteRef = ref(db, `conversationInvites/${invitedId}/${conversationId}/${id}`);
        return await remove(conversationInviteRef)
    }

    async function updateConversation(id: string, data: any) {
        const conversationRef = ref(db, `conversations/${id}`)
        await update(conversationRef, data)
        const conversationSnapshot = await get(conversationRef)
        const participantIds = Object.keys(conversationSnapshot.child("participants").val())
        let promises = []
        for(let participantId of participantIds) {
            promises.push(update(ref(db, `users/${participantId}/conversations/${id}`), data))
        }
        await Promise.all(promises)
        
    }

    async function deleteConversation(id: string) {
        const conversationRef = ref(db, `conversations/${id}`)
        const conversationSnapshot = await get(conversationRef)
        const participantIds = Object.keys(conversationSnapshot.child("participants").val())
        let promises = []
        for(let participantId of participantIds) {
            promises.push(remove(ref(db, `users/${participantId}/conversations/${id}`)))
        }
        await Promise.all(promises)
        await remove(conversationRef)
    }

    async function updateLastReadMessage(uid: string, conversationId: string, timestamp: number) {
        return await update(ref(db, `users/${uid}/conversations/${conversationId}`), {
            lastReadMessageTimestamp: timestamp
        })
    }

    return {
        createUser,
        updateUser,
        getUser,
        getUserByUsername,
        getAllUsers,
        onUserConversationsChange,
        onNewMessageAdded,
        getMessages,
        createMessage,
        createConversation,
        onConversationChange,
        addUserToConversation,
        removeUserFromConversation,
        onConversationInvitesChange,
        createConversationInvite,
        deleteConversationInvite,
        deleteAllConversationInvites,
        updateConversation,
        deleteConversation,
        updateLastReadMessage,
        onMesageRemoved,
        onMessages,
        onUserChange
    }

})()

export default DatabaseClient