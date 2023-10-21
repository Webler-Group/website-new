import express from "express";
import profileController from "../controllers/blogController";

const router = express.Router();

router.route("/")
    .post(profileController.getBlogEntries);

router.route("/GetBlog")
    .post(profileController.getBlogEntry);


export default router;
