import express from "express";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import channelsController from "../controllers/channelsController";

const router = express.Router();

router.use(verifyJWT);

router.use(protectRoute);

router.route("/").post(channelsController.getChannelsList);
router.route("/CreateDirectMessages").post(channelsController.createDirectMessages);
router.route("/CreateGroup").post(channelsController.createGroup);
router.route("/GetChannel").post(channelsController.getChannel);
router.route("/GroupInviteUser").post(channelsController.groupInviteUser);
router.route("/Invites").post(channelsController.getInvitesList);
router.route("/AcceptInvite").post(channelsController.acceptInvite);
router.route("/GroupRemoveUser").post(channelsController.groupRemoveUser);
router.route("/Messages").post(channelsController.getMessages);
router.route("/LeaveChannel").post(channelsController.leaveChannel);
router.route("/GroupCancelInvite").post(channelsController.groupCancelInvite);
router.route("/GroupRename").post(channelsController.groupRename);
router.route("/GroupChangeRole").post(channelsController.groupChangeRole);
router.route("/DeleteChannel").post(channelsController.deleteChannel);
router.route("/GetUnseenMessagesCount").post(channelsController.getUnseenMessagesCount);
router.route("/MuteChannel").post(channelsController.muteChannel);

export default router;