import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import socket from "../socket";
import "../style/ActivityLogPanel.css";

function ActivityLogPanel() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get("/logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLogs();

    const refreshLogs = () => fetchLogs();

    socket.on("taskCreated", refreshLogs);
    socket.on("taskUpdated", refreshLogs);
    socket.on("taskDeleted", refreshLogs);

    return () => {
      socket.off("taskCreated", refreshLogs);
      socket.off("taskUpdated", refreshLogs);
      socket.off("taskDeleted", refreshLogs);
    };
  }, []);

  return (
    <div className="activity-log-panel">
      <h3>Activity Log</h3>
      {logs.length === 0 && <p>No activities yet.</p>}
      {logs.map((log) => (
        <div key={log._id} className="log-entry">
          <strong>{log.user?.name || "Unknown User"}</strong> {log.action}
          {log.task && `: ${log.task.title}`}
          <small>{new Date(log.createdAt).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}

export default ActivityLogPanel;
