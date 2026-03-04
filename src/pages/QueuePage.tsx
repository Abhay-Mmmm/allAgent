import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { queueApi, type QueueItem, type QueueStats } from "@/lib/api";
import {
    ListOrdered, Plus, Play, RefreshCw,
    Clock, CheckCircle, XCircle, Phone, AlertCircle, ChevronLeft, ChevronRight
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
    pending: { color: "var(--status-amber)", bg: "var(--status-amber-bg)", icon: Clock },
    calling: { color: "var(--status-cyan)", bg: "var(--status-cyan-bg)", icon: Phone },
    completed: { color: "var(--status-green)", bg: "var(--status-green-bg)", icon: CheckCircle },
    failed: { color: "var(--status-red)", bg: "var(--status-red-bg)", icon: XCircle },
};

const TH_STYLE = {
    padding: "10px 16px",
    textAlign: "left" as const,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--surface-page)",
    whiteSpace: "nowrap" as const,
};

export const QueuePage = () => {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [campaignLoading, setCampaignLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [addInput, setAddInput] = useState("");
    const [adding, setAdding] = useState(false);
    const limit = 50;

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const data = await queueApi.list(page, limit, statusFilter || undefined);
            setItems(data.items);
            setStats(data.stats);
            setTotal(data.total);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchQueue(); }, [page, statusFilter]);

    // Auto-refresh every 10s when there are active calls
    useEffect(() => {
        if (!stats || stats.calling === 0) return;
        const interval = setInterval(fetchQueue, 10_000);
        return () => clearInterval(interval);
    }, [stats]);

    const handleAddNumbers = async () => {
        const nums = addInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        if (nums.length === 0) return;
        setAdding(true);
        setMessage(null);
        try {
            const res = await queueApi.add(nums);
            setMessage({ type: "ok", text: res.message });
            setAddInput("");
            fetchQueue();
        } catch (e: any) {
            setMessage({ type: "err", text: e.message });
        } finally {
            setAdding(false);
        }
    };

    const handleStartCampaign = async () => {
        setCampaignLoading(true);
        setMessage(null);
        try {
            const res = await queueApi.startCampaign();
            setMessage({ type: "ok", text: `Campaign started (ID: ${res.campaign_id.slice(0, 8)}…)` });
            setTimeout(fetchQueue, 3000);
        } catch (e: any) {
            setMessage({ type: "err", text: e.message });
        } finally {
            setCampaignLoading(false);
        }
    };

    const totalPages = Math.ceil(total / limit);
    const pendingCount = stats?.pending ?? 0;

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 32px" }}>

                {/* ── Header ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Call Queue</h1>
                        <p className="page-subtitle">Manage and launch your outbound calling campaign</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            id="refresh-queue"
                            onClick={fetchQueue}
                            disabled={loading}
                            className="btn btn-secondary"
                            style={{ gap: 6 }}
                        >
                            <RefreshCw size={13} />
                            Refresh
                        </button>
                        <button
                            id="start-campaign-btn"
                            onClick={handleStartCampaign}
                            disabled={campaignLoading || pendingCount === 0}
                            className="btn btn-primary"
                            style={{ gap: 6, padding: "7px 14px" }}
                        >
                            <Play size={13} />
                            {campaignLoading
                                ? "Starting…"
                                : `Start Campaign${pendingCount > 0 ? ` · ${pendingCount}` : ""}`
                            }
                        </button>
                    </div>
                </div>

                {/* ── Status Tabs ── */}
                {stats && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                        {/* All tab */}
                        <button
                            onClick={() => { setStatusFilter(""); setPage(1); }}
                            className="btn"
                            style={{
                                background: statusFilter === "" ? "var(--text-primary)" : "var(--surface-card)",
                                color: statusFilter === "" ? "#fff" : "var(--text-secondary)",
                                borderColor: statusFilter === "" ? "var(--text-primary)" : "var(--border-default)",
                                boxShadow: "var(--shadow-xs)",
                                gap: 6,
                            }}
                        >
                            All
                            <span style={{
                                fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
                                background: statusFilter === "" ? "rgba(255,255,255,0.2)" : "var(--surface-inset)",
                                color: statusFilter === "" ? "#fff" : "var(--text-tertiary)",
                            }}>
                                {stats.total}
                            </span>
                        </button>

                        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                            const count = stats[status as keyof QueueStats] as number;
                            const isActive = statusFilter === status;
                            const Icon = cfg.icon;
                            return (
                                <button
                                    key={status}
                                    onClick={() => { setStatusFilter(isActive ? "" : status); setPage(1); }}
                                    className="btn"
                                    style={{
                                        background: isActive ? cfg.bg : "var(--surface-card)",
                                        color: isActive ? cfg.color : "var(--text-secondary)",
                                        borderColor: isActive ? cfg.color : "var(--border-default)",
                                        boxShadow: "var(--shadow-xs)",
                                        gap: 5,
                                        textTransform: "capitalize",
                                    }}
                                >
                                    <Icon size={13} />
                                    {status}
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
                                        background: isActive ? "rgba(0,0,0,0.1)" : "var(--surface-inset)",
                                        color: isActive ? cfg.color : "var(--text-tertiary)",
                                    }}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Alert ── */}
                {message && (
                    <div className={`alert ${message.type === "ok" ? "alert-success" : "alert-error"} animate-in`}>
                        {message.type === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {message.text}
                    </div>
                )}

                {/* ── Two-column ── */}
                <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }}>

                    {/* Add Numbers Panel */}
                    <div className="card" style={{ overflow: "hidden" }}>
                        <div className="card-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Plus size={14} color="var(--text-tertiary)" />
                                <span className="card-title">Add Numbers</span>
                            </div>
                        </div>
                        <div style={{ padding: "16px" }}>
                            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10, lineHeight: 1.5 }}>
                                One number per line or comma-separated:
                            </p>
                            <textarea
                                id="phone-numbers-input"
                                value={addInput}
                                onChange={e => setAddInput(e.target.value)}
                                placeholder={"+91XXXXXXXXXX\n+91YYYYYYYYYY"}
                                rows={7}
                                className="field"
                                style={{
                                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                                    fontSize: 12,
                                    resize: "vertical",
                                    lineHeight: 1.6,
                                }}
                            />
                            <button
                                id="add-to-queue-btn"
                                onClick={handleAddNumbers}
                                disabled={adding || !addInput.trim()}
                                className="btn btn-primary"
                                style={{ width: "100%", marginTop: 10, justifyContent: "center", padding: "8px" }}
                            >
                                <Plus size={13} />
                                {adding ? "Adding…" : "Add to Queue"}
                            </button>
                        </div>
                    </div>

                    {/* Queue Table */}
                    <div className="card" style={{ overflow: "hidden" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {["Phone Number", "Status", "Attempts", "Added"].map(h => (
                                        <th key={h} style={TH_STYLE}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [0, 1, 2, 3, 4].map(i => (
                                        <tr key={i}>
                                            {[0, 1, 2, 3].map(j => (
                                                <td key={j} style={{ padding: "14px 16px" }}>
                                                    <div className="skeleton" style={{ height: 12, borderRadius: 4, width: j === 0 ? "60%" : j === 1 ? "40%" : "25%" }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className="empty-state">
                                                <div className="empty-state-icon"><ListOrdered size={18} color="var(--text-tertiary)" /></div>
                                                <p className="empty-state-title">Queue is empty</p>
                                                <p className="empty-state-desc">Add phone numbers on the left to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : items.map(item => {
                                    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                                    const Icon = cfg.icon;
                                    return (
                                        <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                            <td style={{ fontWeight: 500, fontSize: 13, color: "var(--text-primary)", fontFamily: "monospace" }}>
                                                {item.phone_number}
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: cfg.bg, color: cfg.color, gap: 5, textTransform: "capitalize" }}>
                                                    <Icon size={11} /> {item.status}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                                                {item.attempts}
                                            </td>
                                            <td style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                                                {new Date(item.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <span className="pagination-info">Page {page} of {totalPages}</span>
                                <div style={{ display: "flex", gap: 4 }}>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary" style={{ padding: "5px 9px" }}>
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary" style={{ padding: "5px 9px" }}>
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};
