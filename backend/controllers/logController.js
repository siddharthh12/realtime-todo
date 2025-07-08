const ActionLog = require("../models/ActionLog");
const User = require("../models/User");
const Task = require("../models/Task");

const getLogs = async (req, res) => {
  try {
    const logs = await ActionLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("user", "name email")
      .populate("task", "title");
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getLogs };
