import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "hsl(220 20% 97%)", fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 80, fontWeight: 800, color: "#e2e8f0", lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginTop: 12 }}>Page Not Found</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
          The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            marginTop: 24,
            padding: "10px 24px",
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            color: "#fff", border: "none", borderRadius: 10,
            fontWeight: 600, fontSize: 14, cursor: "pointer", minHeight: "auto",
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
