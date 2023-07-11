const express = require("express");

const router = express.Router();

router.route("/").get((req,res)=> res.status(202).json({group:"webler",allies:"sia",enemies:"sololearn"});

module.exports = router;
