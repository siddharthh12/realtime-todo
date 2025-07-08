const Task = require("../models/Task");
const ActionLog = require("../models/ActionLog");
const User = require("../models/User");

const createTask = async (req, res) => {
  const { title, description, assignedUser, status, priority } = req.body;
  try {
    const task = await Task.create({
      title,
      description,
      assignedUser: assignedUser || req.user._id,
      status,
      priority,
    });

    // Populate the task with user info before sending
    const populatedTask = await Task.findById(task._id).populate("assignedUser", "name email");

    await ActionLog.create({
      user: req.user._id,
      action: "Created Task",
      task: task._id,
    });

    if (req.io) {
      req.io.emit("taskCreated", populatedTask);
    }

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error("❌ Create Task Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedUser", "name email");
    res.json(tasks);
  } catch (error) {
    console.error("❌ Get Tasks Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, assignedUser, status, priority, clientUpdatedAt, force } = req.body;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Conflict detection - only check if clientUpdatedAt is provided and force is not true
    if (!force && clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt).getTime();
      const serverTime = new Date(task.updatedAt).getTime();
      
      if (clientTime !== serverTime) {
        console.log(`🔄 Conflict detected for task ${id}:`);
        console.log(`Client time: ${new Date(clientTime).toISOString()}`);
        console.log(`Server time: ${new Date(serverTime).toISOString()}`);
        
        // Return current server state for conflict resolution
        const conflictTask = await Task.findById(id).populate("assignedUser", "name email");
        return res.status(409).json({ 
          message: "Conflict detected", 
          serverTask: conflictTask 
        });
      }
    }

    // Store original values for logging
    const originalValues = {
      title: task.title,
      description: task.description,
      assignedUser: task.assignedUser,
      status: task.status,
      priority: task.priority,
    };

    // Update task fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedUser !== undefined) task.assignedUser = assignedUser;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;

    // Save and populate
    await task.save();
    const updatedTask = await Task.findById(id).populate("assignedUser", "name email");

    // Create detailed action log
    const changes = [];
    if (originalValues.title !== updatedTask.title) changes.push(`title: "${originalValues.title}" → "${updatedTask.title}"`);
    if (originalValues.description !== updatedTask.description) changes.push(`description: "${originalValues.description}" → "${updatedTask.description}"`);
    if (originalValues.status !== updatedTask.status) changes.push(`status: "${originalValues.status}" → "${updatedTask.status}"`);
    if (originalValues.priority !== updatedTask.priority) changes.push(`priority: "${originalValues.priority}" → "${updatedTask.priority}"`);
    if (originalValues.assignedUser?.toString() !== updatedTask.assignedUser?._id?.toString()) {
      changes.push(`assignedUser: "${originalValues.assignedUser}" → "${updatedTask.assignedUser?._id}"`);
    }

    const actionDescription = changes.length > 0 
      ? `Updated Task (${changes.join(", ")})${force ? " [FORCED]" : ""}`
      : `Updated Task${force ? " [FORCED]" : ""}`;

    await ActionLog.create({
      user: req.user._id,
      action: actionDescription,
      task: task._id,
    });

    if (req.io) {
      req.io.emit("taskUpdated", updatedTask);
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("❌ Update Task Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteTask = async (req, res) => {
  const { id } = req.params;
  const { clientUpdatedAt, force } = req.body;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Conflict detection for delete operations
    if (!force && clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt).getTime();
      const serverTime = new Date(task.updatedAt).getTime();
      
      if (clientTime !== serverTime) {
        console.log(`🔄 Delete conflict detected for task ${id}:`);
        console.log(`Client time: ${new Date(clientTime).toISOString()}`);
        console.log(`Server time: ${new Date(serverTime).toISOString()}`);
        
        // Return current server state for conflict resolution
        const conflictTask = await Task.findById(id).populate("assignedUser", "name email");
        return res.status(409).json({ 
          message: "Conflict detected", 
          serverTask: conflictTask 
        });
      }
    }

    // Store task info for logging before deletion
    const taskTitle = task.title;
    
    await Task.findByIdAndDelete(id);

    await ActionLog.create({
      user: req.user._id,
      action: `Deleted Task "${taskTitle}"${force ? " [FORCED]" : ""}`,
      task: id,
    });

    if (req.io) {
      req.io.emit("taskDeleted", id);
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Task Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const smartAssignTask = async (req, res) => {
  const { id } = req.params;
  const { clientUpdatedAt, force } = req.body;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Conflict detection for smart assign
    if (!force && clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt).getTime();
      const serverTime = new Date(task.updatedAt).getTime();
      
      if (clientTime !== serverTime) {
        console.log(`🔄 Smart assign conflict detected for task ${id}:`);
        console.log(`Client time: ${new Date(clientTime).toISOString()}`);
        console.log(`Server time: ${new Date(serverTime).toISOString()}`);
        
        // Return current server state for conflict resolution
        const conflictTask = await Task.findById(id).populate("assignedUser", "name email");
        return res.status(409).json({ 
          message: "Conflict detected", 
          serverTask: conflictTask 
        });
      }
    }

    // Find all users
    const users = await User.find();
    if (users.length === 0) {
      return res.status(400).json({ message: "No users found for assignment" });
    }

    let minTaskCount = Infinity;
    let selectedUser = null;

    // Calculate task load for each user
    for (const user of users) {
      const count = await Task.countDocuments({
        assignedUser: user._id,
        status: { $in: ["Todo", "In Progress"] },
      });
      
      if (count < minTaskCount) {
        minTaskCount = count;
        selectedUser = user;
      }
    }

    if (!selectedUser) {
      return res.status(400).json({ message: "No suitable user found for assignment" });
    }

    // Store original assignedUser for logging
    const originalAssignedUser = task.assignedUser;

    // Update task with new assignment
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { assignedUser: selectedUser._id },
      { new: true }
    ).populate("assignedUser", "name email");

    // Create detailed action log
    const previousAssignment = originalAssignedUser ? 
      await User.findById(originalAssignedUser).select("name") : null;
    
    const actionDescription = `Smart Assigned task from ${
      previousAssignment ? previousAssignment.name : "Unassigned"
    } to ${selectedUser.name} (${minTaskCount} active tasks)${force ? " [FORCED]" : ""}`;

    await ActionLog.create({
      user: req.user._id,
      action: actionDescription,
      task: updatedTask._id,
    });

    if (req.io) {
      req.io.emit("taskUpdated", updatedTask);
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("❌ Smart Assign Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Optional: Add a method to get task by ID with conflict info
const getTaskById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const task = await Task.findById(id).populate("assignedUser", "name email");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    res.json(task);
  } catch (error) {
    console.error("❌ Get Task By ID Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  createTask, 
  getTasks, 
  updateTask, 
  deleteTask, 
  smartAssignTask,
  getTaskById 
};