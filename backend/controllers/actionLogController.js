const ActionLog = require("../models/ActionLog");

const getActionLogs = async (req, res) => {
  try {
    const logs = await ActionLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("user", "name email")
      .populate("task", "title");

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getActionLogs };
