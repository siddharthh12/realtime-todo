const express = require("express");
const { getActionLogs } = require("../controllers/actionLogController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getActionLogs);

module.exports = router;
