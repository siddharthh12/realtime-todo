import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    } else {
      // Optional: decode token to get user, or fetch from backend if needed
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({ email: payload.email, name: payload.name });
    }
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/");
    }
  };

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 20px",
      background: "#4CAF50",
      color: "white",
      position: "sticky",
      top: 0,
      zIndex: 1000
    }}>
      <div 
        style={{ 
          fontWeight: "bold", 
          fontSize: "18px", 
          cursor: "pointer" 
        }}
        onClick={() => navigate("/board")}
      >
        📋 Realtime Kanban Board
      </div>
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px" }}>👤 {user.name || user.email}</span>
          <button 
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              background: "#f44336",
              border: "none",
              borderRadius: "4px",
              color: "white",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
