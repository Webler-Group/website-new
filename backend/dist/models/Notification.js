"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const socketServer_1 = require("../config/socketServer");
const notificationSchema = new mongoose_1.default.Schema({
    _type: { type: Number, required: true },
    message: { type: String, required: true },
    user: { type: mongoose_1.default.Types.ObjectId, ref: "User", required: true },
    actionUser: { type: mongoose_1.default.Types.ObjectId, ref: "User", required: true },
    isSeen: { type: Boolean, default: false },
    isClicked: { type: Boolean, default: false },
    codeId: { type: mongoose_1.default.Types.ObjectId, ref: "Code" },
    questionId: { type: mongoose_1.default.Types.ObjectId, ref: "Post" },
    postId: { type: mongoose_1.default.Types.ObjectId, ref: "Post" },
    hidden: { type: Boolean, default: false }
}, {
    timestamps: true
});
// --- SAVE ---
notificationSchema.post("save", (doc, next) => {
    const io = (0, socketServer_1.getIO)();
    if (io) {
        io.to((0, socketServer_1.uidRoom)(doc.user.toString())).emit("notification:new", {});
    }
    return next();
});
// --- DELETE ONE ---
notificationSchema.pre("deleteOne", { document: false, query: true }, function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const filter = this.getFilter();
        const doc = yield this.model.findOne(filter);
        this._docToDelete = doc;
        next();
    });
});
notificationSchema.post("deleteOne", { document: false, query: true }, function () {
    const doc = this._docToDelete;
    if (doc && !doc.isClicked) {
        const io = (0, socketServer_1.getIO)();
        if (io) {
            io.to((0, socketServer_1.uidRoom)(doc.user.toString())).emit("notification:deleted", {});
        }
    }
});
// --- DELETE MANY ---
notificationSchema.pre("deleteMany", { document: false, query: true }, function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const filter = this.getFilter();
        const docs = yield this.model.find(filter);
        this._docsToDelete = docs;
        next();
    });
});
notificationSchema.post("deleteMany", { document: false, query: true }, function () {
    const docs = this._docsToDelete;
    if (!docs)
        return;
    const io = (0, socketServer_1.getIO)();
    if (io) {
        io.to(docs.filter(x => !x.isClicked).map(x => (0, socketServer_1.uidRoom)(x.user.toString()))).emit("notification:deleted", {});
    }
});
const Notification = mongoose_1.default.model("Notification", notificationSchema);
exports.default = Notification;
