const mongoose = require("mongoose");

const actionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  },
  { timestamps: true }
);

const ActionLog = mongoose.model("ActionLog", actionLogSchema);
module.exports = ActionLog;
