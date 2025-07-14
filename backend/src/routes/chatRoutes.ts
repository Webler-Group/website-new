import express from "express";
import { getChannelMessages, getChannelsList, sendChannelMessage } from "../controllers/chatController";
import verifyJWT from "../middleware/verifyJWT";




const router = express.Router();
router.use(verifyJWT);
router.route("/").post(getChannelsList); 
router.route("/GetChannelMessages").post(getChannelMessages);
router.route("/sendChannelMessage").post(sendChannelMessage);

export {router as channelRoutes}

