import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import ActivityLogPanel from "./ActivityLogPanel";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function KanbanBoard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "Todo",
    priority: "Medium",
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingData, setEditingData] = useState({
    title: "",
    description: "",
  });

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get("/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(response.data);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        navigate("/");
      }
    }
  };

  useEffect(() => {
    fetchTasks();
    socket.on("taskCreated", (task) => setTasks((prev) => [...prev, task]));
    socket.on("taskUpdated", (updatedTask) =>
      setTasks((prev) =>
        prev.map((task) => (task._id === updatedTask._id ? updatedTask : task))
      )
    );
    socket.on("taskDeleted", (taskId) =>
      setTasks((prev) => prev.filter((task) => task._id !== taskId))
    );

    return () => {
      socket.off("taskCreated");
      socket.off("taskUpdated");
      socket.off("taskDeleted");
    };
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axiosInstance.post("/tasks", newTask, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewTask({
        title: "",
        description: "",
        status: "Todo",
        priority: "Medium",
      });
    } catch (error) {
      console.error(error);
      alert("Failed to create task");
    }
  };

  const handleUpdateTask = async (id, updatedFields, force = false) => {
    const token = localStorage.getItem("token");
    try {
      await axiosInstance.put(
        `/tasks/${id}`,
        { ...updatedFields, force },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      if (error.response && error.response.status === 409) {
        const serverData = error.response.data.serverTask;
        const confirmOverwrite = window.confirm(
          "🔄 Conflict detected!\n" +
            "The task was updated by another user while you were editing.\n\n" +
            `📝 Your changes:\n` +
            `Title: ${updatedFields.title || "No change"}\n` +
            `Description: ${updatedFields.description || "No change"}\n` +
            `Status: ${updatedFields.status || "No change"}\n` +
            `Priority: ${updatedFields.priority || "No change"}\n\n` +
            `💾 Current server version:\n` +
            `Title: ${serverData.title}\n` +
            `Description: ${serverData.description}\n` +
            `Status: ${serverData.status}\n` +
            `Priority: ${serverData.priority}\n\n` +
            "✅ Click OK to overwrite with your changes\n" +
            "❌ Click Cancel to keep server version and discard your changes"
        );
        if (confirmOverwrite) {
          await handleUpdateTask(id, updatedFields, true); // retry with force
        } else {
          fetchTasks(); // discard local changes and refresh
          if (editingTaskId === id) {
            cancelEditing(); // exit edit mode
          }
        }
      } else {
        console.error(error);
        alert("Failed to update task: " + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleDeleteTask = async (id) => {
    const task = tasks.find((t) => t._id === id);
    if (!task) return;

    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axiosInstance.delete(`/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { clientUpdatedAt: task.updatedAt } // Send for conflict check
      });
    } catch (error) {
      if (error.response && error.response.status === 409) {
        const serverData = error.response.data.serverTask;
        const confirmOverwrite = window.confirm(
          "🔄 Conflict detected!\n" +
            "The task was updated by another user.\n\n" +
            `📝 Current server version:\n` +
            `Title: ${serverData.title}\n` +
            `Description: ${serverData.description}\n` +
            `Status: ${serverData.status}\n\n` +
            "The task has been modified. Do you still want to delete it?\n" +
            "✅ Click OK to delete anyway\n" +
            "❌ Click Cancel to keep the task"
        );
        if (confirmOverwrite) {
          try {
            await axiosInstance.delete(`/tasks/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
              data: { clientUpdatedAt: task.updatedAt, force: true }
            });
          } catch (forceError) {
            console.error(forceError);
            alert("Failed to delete task: " + (forceError.response?.data?.message || forceError.message));
          }
        } else {
          fetchTasks(); // refresh to show current state
        }
      } else {
        console.error(error);
        alert("Failed to delete task: " + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleSmartAssign = async (id, force = false) => {
    const token = localStorage.getItem("token");
    const task = tasks.find((t) => t._id === id);
    if (!task) return;
    
    try {
      await axiosInstance.put(
        `/tasks/${id}/smart-assign`,
        { clientUpdatedAt: task.updatedAt, force },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      if (error.response && error.response.status === 409) {
        const serverData = error.response.data.serverTask;
        const confirmOverwrite = window.confirm(
          "🔄 Conflict detected!\n" +
            "The task was updated by another user.\n\n" +
            `📝 Current server version:\n` +
            `Title: ${serverData.title}\n` +
            `Description: ${serverData.description}\n` +
            `Status: ${serverData.status}\n` +
            `Assigned to: ${serverData.assignedUser?.name || "Unassigned"}\n\n` +
            "The task has been modified. Do you still want to smart assign it?\n" +
            "✅ Click OK to proceed with smart assign\n" +
            "❌ Click Cancel to keep current assignment"
        );
        if (confirmOverwrite) {
          await handleSmartAssign(id, true); // retry with force
        } else {
          fetchTasks(); // refresh to show current state
        }
      } else {
        console.error(error);
        alert("Smart Assign failed: " + (error.response?.data?.message || error.message));
      }
    }
  };

  const startEditing = (task) => {
    setEditingTaskId(task._id);
    setEditingData({
      title: task.title,
      description: task.description,
    });
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingData({ title: "", description: "" });
  };

  const saveEditing = async (task) => {
    if (!editingData.title.trim()) {
      alert("Title cannot be empty.");
      return;
    }
    await handleUpdateTask(task._id, {
      title: editingData.title,
      description: editingData.description,
      clientUpdatedAt: task.updatedAt,
    });
    cancelEditing();
  };

  // Configure sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    })
  );

  const DroppableColumn = ({ id, title, children }) => {
    const { setNodeRef } = useDroppable({ id });
    return (
      <div
        ref={setNodeRef}
        style={{
          width: "32%",
          minHeight: "300px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "10px",
          background: "#f9f9f9",
        }}
      >
        <h3>{title}</h3>
        {children}
      </div>
    );
  };

  const DraggableTask = ({ task }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useDraggable({ id: task._id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      userSelect: "none",
      padding: 12,
      margin: "0 0 8px 0",
      background: "white",
      border: "1px solid #ddd",
      borderRadius: "4px",
      width: "100%",
      boxSizing: "border-box",
      opacity: isDragging ? 0.95 : 1,
      cursor: isDragging ? "grabbing" : "grab",
    };

    // Handle button clicks with event stopping
    const handleButtonClick = (e, callback) => {
      e.preventDefault();
      e.stopPropagation();
      callback();
    };

    return (
      <div ref={setNodeRef} style={style}>
        {/* Drag handle area - only this area should have drag listeners */}
        <div {...attributes} {...listeners} style={{ cursor: "grab", marginBottom: "8px" }}>
          <div style={{ 
            padding: "4px 8px", 
            background: "#f0f0f0", 
            borderRadius: "4px", 
            fontSize: "12px",
            color: "#666"
          }}>
            ⋮⋮ Drag to move
          </div>
        </div>

        {editingTaskId === task._id ? (
          <div style={{ pointerEvents: "auto" }}>
            <input
              type="text"
              value={editingData.title}
              onChange={(e) =>
                setEditingData({ ...editingData, title: e.target.value })
              }
              style={{ width: "100%", marginBottom: "5px", padding: "4px" }}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <textarea
              value={editingData.description}
              onChange={(e) =>
                setEditingData({ ...editingData, description: e.target.value })
              }
              style={{ width: "100%", marginBottom: "5px", padding: "4px", minHeight: "60px" }}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <div>
              <button 
                onClick={(e) => handleButtonClick(e, () => saveEditing(task))}
                style={{ 
                  marginRight: "5px", 
                  padding: "4px 8px", 
                  background: "#4CAF50", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Save
              </button>
              <button 
                onClick={(e) => handleButtonClick(e, cancelEditing)}
                style={{ 
                  padding: "4px 8px", 
                  background: "#f44336", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h4 style={{ margin: "0 0 8px 0" }}>{task.title}</h4>
            <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>
              {task.description}
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
              <strong>Priority:</strong> {task.priority}
            </p>
            {task.assignedUser && (
              <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
                <strong>Assigned to:</strong> {task.assignedUser.name}
              </p>
            )}
            <div style={{ marginTop: "8px" }}>
              <button
                onClick={(e) => handleButtonClick(e, () => startEditing(task))}
                style={{ 
                  marginRight: "5px", 
                  padding: "4px 8px", 
                  background: "#2196F3", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Edit
              </button>
              <button
                onClick={(e) => handleButtonClick(e, () => handleDeleteTask(task._id))}
                style={{ 
                  marginRight: "5px", 
                  padding: "4px 8px", 
                  background: "#f44336", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Delete
              </button>
              <button 
                onClick={(e) => handleButtonClick(e, () => handleSmartAssign(task._id))}
                style={{ 
                  padding: "4px 8px", 
                  background: "#FF9800", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Smart Assign
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const onDragEnd = async (event) => {
    const { over, active } = event;
    if (!over) return;

    const newStatusMap = {
      todo: "Todo",
      inProgress: "In Progress",
      done: "Done",
    };

    if (over.id && ["todo", "inProgress", "done"].includes(over.id)) {
      const newStatus = newStatusMap[over.id];
      const task = tasks.find((t) => t._id === active.id);
      if (!task) return;
      
      // Only update if status is actually changing
      if (task.status !== newStatus) {
        await handleUpdateTask(active.id, {
          status: newStatus,
          clientUpdatedAt: task.updatedAt,
        });
      }
    }
  };

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      <div style={{ flex: 1 }}>
        <h2>Kanban Board (Real-Time, Conflict Handling, Smart Assign)</h2>

        <form onSubmit={handleCreateTask} style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
            style={{ marginRight: "5px", padding: "8px" }}
          />
          <input
            type="text"
            placeholder="Description"
            value={newTask.description}
            onChange={(e) =>
              setNewTask({ ...newTask, description: e.target.value })
            }
            style={{ marginRight: "5px", padding: "8px" }}
          />
          <select
            value={newTask.priority}
            onChange={(e) =>
              setNewTask({ ...newTask, priority: e.target.value })
            }
            style={{ marginRight: "5px", padding: "8px" }}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <button 
            type="submit"
            style={{ 
              padding: "8px 16px", 
              background: "#4CAF50", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Add Task
          </button>
        </form>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <DroppableColumn id="todo" title="Todo">
              {tasks.filter((task) => task.status === "Todo").map((task) => (
                <DraggableTask key={task._id} task={task} />
              ))}
            </DroppableColumn>
            <DroppableColumn id="inProgress" title="In Progress">
              {tasks.filter((task) => task.status === "In Progress").map((task) => (
                <DraggableTask key={task._id} task={task} />
              ))}
            </DroppableColumn>
            <DroppableColumn id="done" title="Done">
              {tasks.filter((task) => task.status === "Done").map((task) => (
                <DraggableTask key={task._id} task={task} />
              ))}
            </DroppableColumn>
          </div>
        </DndContext>
      </div>

      <ActivityLogPanel />
    </div>
  );
}

export default KanbanBoard;