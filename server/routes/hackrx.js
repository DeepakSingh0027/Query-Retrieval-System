const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");

// 👇 Don't use destructuring here unless module.exports = { hackrx } was used
const hackrx = require("../controllers/hackrxController");

router.post("/hackrx/run", authenticateToken, hackrx);

module.exports = router;
