import express from "express";
import profileController from "../controllers/blogController";

const router = express.Router();

router.route("/")
    .get(profileController.getBlogEntries);

router.route("/:entryName")
    .get(profileController.getBlogEntry);


export default router;
