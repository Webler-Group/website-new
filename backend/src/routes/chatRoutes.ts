import express from "express";
import { createDirect, createGroupChat, getChannelMessages, getChannelsList, sendChannelMessage } from "../controllers/chatController";
import verifyJWT from "../middleware/verifyJWT";




const router = express.Router();
router.use(verifyJWT);
router.route("/").post(getChannelsList); 
router.route("/getChannelMessages").post(getChannelMessages);
router.route("/sendChannelMessage").post(sendChannelMessage);
router.route("/createDirect").post(createDirect)
router.route("/createGroupChat").post(createGroupChat)

export {router as channelRoutes}

