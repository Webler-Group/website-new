import express from "express";

const router = express.Router();

router.route("/").get((req,res)=> res.send("Hello world. This is webler api demo."));

export default router;