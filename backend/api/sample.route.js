const express = require("express");

const router = express.Router();

router.route("/").get((req,res)=> res.send("Hello world. This is webler api demo."));

module.exports = router;