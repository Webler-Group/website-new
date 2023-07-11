const express = require("express");

const router = express.Router();

router.route("/").get((req,res)=> res.send(json({group:"webler",allies:"sia",enemies:"sololearn"}));

module.exports = router;
