const express = require("express");
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  smartAssignTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, createTask).get(protect, getTasks);
router.route("/:id").put(protect, updateTask).delete(protect, deleteTask);
router.put("/:id/smart-assign", protect, smartAssignTask);

module.exports = router;
