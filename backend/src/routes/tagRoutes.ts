import express from "express";
import tagController from "../controllers/tagController";

const router = express.Router();

router.route("/")
    .post(tagController.getTagList);

router.route("/GetTag")
    .post(tagController.getTag);


export default router;
