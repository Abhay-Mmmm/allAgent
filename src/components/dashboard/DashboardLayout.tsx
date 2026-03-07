import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    PhoneCall,
    ListOrdered,
    Zap,
} from "lucide-react";

interface DashboardLayoutProps {
    children: ReactNode;
}

const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "leads", label: "Leads", icon: Users, path: "/leads" },
    { id: "queue", label: "Call Queue", icon: ListOrdered, path: "/queue" },
    { id: "calls", label: "Call History", icon: PhoneCall, path: "/calls" },
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const activeId = NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.id ?? "dashboard";

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-page)" }}>

            {/* ── Sidebar ────────────────────────────────────────────────── */}
            <aside style={{
                width: 216,
                flexShrink: 0,
                background: "var(--sidebar-bg)",
                borderRight: "1px solid var(--sidebar-border)",
                display: "flex",
                flexDirection: "column",
                position: "sticky",
                top: 0,
                height: "100vh",
                overflow: "hidden",
                zIndex: 40,
            }}>

                {/* Wordmark */}
                <div style={{
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 14px",
                    borderBottom: "1px solid var(--sidebar-border)",
                    overflow: "hidden",
                    flexShrink: 0,
                }}>
                    <div style={{
                        width: 28,
                        height: 28,
                        minWidth: 28,
                        borderRadius: "var(--r-md)",
                        background: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.1) inset",
                    }}>
                        <Zap size={14} color="#fff" fill="#fff" />
                    </div>
                    <div style={{ overflow: "hidden" }}>
                        <div style={{
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: 13,
                            lineHeight: 1,
                            letterSpacing: "-0.01em",
                            whiteSpace: "nowrap",
                        }}>
                            allAgent
                        </div>
                        <div style={{
                            color: "rgba(255,255,255,0.35)",
                            fontSize: 10,
                            marginTop: 2,
                            whiteSpace: "nowrap",
                        }}>
                            Outbound AI Platform
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: "8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
                    {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
                        const isActive = activeId === id;
                        return (
                            <button
                                key={id}
                                id={`nav-${id}`}
                                onClick={() => navigate(path)}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 9,
                                    justifyContent: "flex-start",
                                    padding: "7px 10px",
                                    borderRadius: "var(--r-md)",
                                    border: "none",
                                    cursor: "pointer",
                                    transition: "background var(--t-fast), color var(--t-fast)",
                                    background: isActive ? "rgba(255,255,255,0.09)" : "transparent",
                                    color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                                    fontWeight: isActive ? 500 : 400,
                                    fontSize: 13,
                                    letterSpacing: "-0.005em",
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                    if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) e.currentTarget.style.background = "transparent";
                                    if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                                }}
                            >
                                <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer — status */}
                <div style={{
                    padding: "8px 6px",
                    borderTop: "1px solid var(--sidebar-border)",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "6px 10px",
                        borderRadius: "var(--r-md)",
                    }}>
                        <span style={{
                            display: "block",
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#22c55e",
                            animation: "statusPulse 2.5s ease-in-out infinite",
                            flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                            Operator Console
                        </span>
                    </div>
                </div>
            </aside>

            {/* ── Main ───────────────────────────────────────────────────── */}
            <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
                {children}
            </main>
        </div>
    );
};
