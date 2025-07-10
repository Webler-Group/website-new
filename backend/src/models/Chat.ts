import mongoose, { InferSchemaType, Schema, SchemaTypes } from "mongoose";

// The chat model designed here is general-purpose, that means it can be used for channels, group chats, and direct messages plus maintaining feathres like sending announcements by the server
// The model assumes no User and Chat gets deleted from databse.

// detaild and extensible permissions, by default they are set for an ideal and mature group chat.
const permissions = {
    canSendText:{
        type: Boolean,
        default: true,
    },
    canSendImage:{
        type: Boolean,
        default: true,
    },
    canSendVoice:{
        type: Boolean,
        default: true,
    },
    canSendVideo:{
        type: Boolean,
        default: true,
    },
    canSendCode:{
        type: Boolean,
        default: true,
    },
    canSendPost:{
        type: Boolean,
        default: true,
    },
    canSendExternalLink:{
        type: Boolean,
        default: true,
    },
    // The following permissions for deletions are for without clean up from the database. footage will visible
    canDeleteChat:{
        type: Boolean,
        default: true,
    },
    canDeleteParticipant:{
        type: Boolean,
        default: true,
    },
    canDeleteOwnMessage:{
        type: Boolean,
        default: true,
    },
    canDeleteOthersMessage:{
        type: Boolean,
        default: true,
    },
    canSeeParticipantsList:{
        type: Boolean,
        default: true,
    },
    // The following permissions for deletions of footage

    //The following permissions for deletions are for clean up from the databse

    
}

// Every message can be handled differently by the server.
// A message can be removed from the database without any problems as it was never sent (e.g. erasing any trace to an account).
// But it also can be removed from the chat without that. it can be determined whther the footage of a deleted message is visible or not.
// A participant might be removed from the chat with or without deleting their messages. 
// Attachements are included by their links, which are fetched and displayed by client side.
// Replied messages are considred attachments and there is no internal links between messages.
// For now, a message is dependent on a chat for its exitense on the database.

const chatMessageSchema = new Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1000
    },
    Sender: {
            type: SchemaTypes.ObjectId, // Can point to a non participant
            ref: "User",
            required:true,
    },
    hidden:{ // in case of deleting by someone with the privilege.
        type:Boolean,
        default:false,
    },
    hiddenFootage: {
        type:Boolean,
        default:false,
    },
    hiddenSender: {
        type: Boolean,
        default:false,
    },
    
},{timestamps:true});
const chatSchema = new Schema({
    
    participants:[{
        user:{
            type: SchemaTypes.ObjectId,
            ref: "User",
        },
        permissions
    }],
    createdBy: {
        type: SchemaTypes.ObjectId,
        ref: "User",
        required:true,
    },
    messages: [{
        type: chatMessageSchema,
    }]
},{timestamps:true});

declare interface IChat extends InferSchemaType<typeof chatSchema> {}
const Chat = mongoose.model<IChat>("Chat", chatSchema);
export default Chat;
