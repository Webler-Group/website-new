import mongoose, { InferSchemaType } from "mongoose";
import { getIO, uidRoom } from "../config/socketServer";

const notificationSchema = new mongoose.Schema({
    _type: { type: Number, required: true },
    message: { type: String, required: true },
    user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    actionUser: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    isSeen: { type: Boolean, default: false },
    isClicked: { type: Boolean, default: false },
    codeId: { type: mongoose.Types.ObjectId, ref: "Code" },
    questionId: { type: mongoose.Types.ObjectId, ref: "Post" },
    postId: { type: mongoose.Types.ObjectId, ref: "Post" },
    feedId: { type: mongoose.Types.ObjectId, ref: "Post" }, 
    hidden: { type: Boolean, default: false }
}, {
    timestamps: true
});

// --- SAVE ---
notificationSchema.post("save", (doc, next) => {
    const io = getIO();
    if (io) {
        io.to(uidRoom(doc.user.toString())).emit("notification:new", {});
    }
    return next();
});

// --- DELETE ONE ---
notificationSchema.pre("deleteOne", { document: false, query: true }, async function (next) {
    const filter = this.getFilter();
    const doc = await this.model.findOne(filter);
    (this as any)._docToDelete = doc;
    next();
});

notificationSchema.post("deleteOne", { document: false, query: true }, function () {
    const doc = (this as any)._docToDelete;
    if (doc && !doc.isClicked) {
        const io = getIO();
        if (io) {
            io.to(uidRoom(doc.user.toString())).emit("notification:deleted", {});
        }
    }
});

// --- DELETE MANY ---
notificationSchema.pre("deleteMany", { document: false, query: true }, async function (next) {
    const filter = this.getFilter();
    const docs = await this.model.find(filter);
    (this as any)._docsToDelete = docs;
    next();
});

notificationSchema.post("deleteMany", { document: false, query: true }, function () {
    const docs = (this as any)._docsToDelete as any[];
    if (!docs) return;

    const io = getIO();
    if (io) {
        io.to(docs.filter(x => !x.isClicked).map(x => uidRoom(x.user.toString()))).emit("notification:deleted", {});
    }
});

const Notification = mongoose.model<InferSchemaType<typeof notificationSchema>>("Notification", notificationSchema);
export default Notification;
