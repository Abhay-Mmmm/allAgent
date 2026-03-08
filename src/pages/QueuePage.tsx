import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { queueApi, leadsApi, type QueueItem, type QueueStats } from "@/lib/api";
import {
    ListOrdered, Plus, Play, RefreshCw, Upload, Trash2, Pencil, Check, X,
    Clock, CheckCircle, XCircle, Phone, AlertCircle, ChevronLeft, ChevronRight
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending:   { label: "Pending",   color: "var(--status-amber)", bg: "var(--status-amber-bg)", icon: Clock },
    calling:   { label: "Calling",   color: "var(--status-cyan)",  bg: "var(--status-cyan-bg)",  icon: Phone },
    completed: { label: "Completed", color: "var(--status-green)", bg: "var(--status-green-bg)", icon: CheckCircle },
    no_answer: { label: "No answer", color: "var(--status-amber)", bg: "var(--status-amber-bg)", icon: AlertCircle },
    failed:    { label: "Failed",    color: "var(--status-red)",   bg: "var(--status-red-bg)",   icon: XCircle },
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

    // Add form
    const [addName, setAddName] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [adding, setAdding] = useState(false);

    // Inline edit
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [saving, setSaving] = useState(false);

    // CSV import
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

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

    const showMsg = (type: "ok" | "err", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    // ── Add single lead + queue entry ──
    const handleAddEntry = async () => {
        const phone = addPhone.trim();
        if (!phone) return;
        setAdding(true);
        try {
            const res = await queueApi.add([{ name: addName.trim() || undefined, phone_number: phone }]);
            showMsg("ok", res.message);
            setAddName("");
            setAddPhone("");
            fetchQueue();
        } catch (e: any) {
            showMsg("err", e.message);
        } finally {
            setAdding(false);
        }
    };

    // ── CSV Import ──
    const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const res = await leadsApi.importCsv(file);
            showMsg("ok", res.message);
            fetchQueue();
        } catch (err: any) {
            showMsg("err", err.message);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // ── Start Campaign ──
    const handleStartCampaign = async () => {
        setCampaignLoading(true);
        setMessage(null);
        try {
            const res = await queueApi.startCampaign();
            showMsg("ok", `Campaign started (ID: ${res.campaign_id.slice(0, 8)}…)`);
            setTimeout(fetchQueue, 3000);
        } catch (e: any) {
            showMsg("err", e.message);
        } finally {
            setCampaignLoading(false);
        }
    };

    // ── Inline Edit ──
    const startEdit = (item: QueueItem) => {
        setEditingId(item.id);
        setEditName(item.lead_name ?? "");
        setEditPhone(item.phone_number);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditPhone("");
    };

    const saveEdit = async (item: QueueItem) => {
        setSaving(true);
        try {
            const result = await leadsApi.list(1, 1, undefined, item.phone_number);
            const lead = result.leads[0];
            if (lead) {
                await leadsApi.update(lead.id, {
                    name: editName.trim() || undefined,
                    phone_number: editPhone.trim() || undefined,
                });
            }
            showMsg("ok", "Lead updated");
            cancelEdit();
            fetchQueue();
        } catch (e: any) {
            showMsg("err", e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──
    const handleDelete = async (item: QueueItem) => {
        if (!confirm(`Delete queue entry for ${item.lead_name || item.phone_number}?`)) return;
        try {
            const result = await leadsApi.list(1, 1, undefined, item.phone_number);
            const lead = result.leads[0];
            if (lead) {
                await leadsApi.delete(lead.id);
            }
            showMsg("ok", "Entry deleted");
            fetchQueue();
        } catch (e: any) {
            showMsg("err", e.message);
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
                        <button onClick={fetchQueue} disabled={loading} className="btn btn-secondary" style={{ gap: 6 }}>
                            <RefreshCw size={13} />
                            Refresh
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="btn btn-secondary"
                            style={{ gap: 6 }}
                        >
                            <Upload size={13} />
                            {importing ? "Importing…" : "Import CSV"}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            style={{ display: "none" }}
                            onChange={handleCsvImport}
                        />
                        <button
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
                                    }}
                                >
                                    <Icon size={13} />
                                    {cfg.label}
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
                <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>

                    {/* Add Lead Panel */}
                    <div className="card" style={{ overflow: "hidden" }}>
                        <div className="card-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Plus size={14} color="var(--text-tertiary)" />
                                <span className="card-title">Add Lead</span>
                            </div>
                        </div>
                        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={addName}
                                    onChange={e => setAddName(e.target.value)}
                                    placeholder="John Doe"
                                    className="field"
                                    style={{ fontSize: 13 }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={addPhone}
                                    onChange={e => setAddPhone(e.target.value)}
                                    placeholder="+919876543210"
                                    className="field"
                                    style={{ fontSize: 13, fontFamily: "'SF Mono', 'Fira Code', monospace" }}
                                    onKeyDown={e => { if (e.key === "Enter") handleAddEntry(); }}
                                />
                            </div>
                            <button
                                onClick={handleAddEntry}
                                disabled={adding || !addPhone.trim()}
                                className="btn btn-primary"
                                style={{ width: "100%", justifyContent: "center", padding: "8px" }}
                            >
                                <Plus size={13} />
                                {adding ? "Adding…" : "Add to Queue"}
                            </button>
                        </div>

                        {/* CSV info */}
                        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border-subtle)", marginTop: 4, paddingTop: 12 }}>
                            <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5, margin: 0 }}>
                                Or use <strong>Import CSV</strong> above with columns:<br />
                                <code style={{ fontSize: 10, background: "var(--surface-inset)", padding: "1px 4px", borderRadius: 3 }}>name,phone_number</code>
                            </p>
                        </div>
                    </div>

                    {/* Queue Table */}
                    <div className="card" style={{ overflow: "hidden" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {["Name", "Phone Number", "Status", "Attempts", "Added", "Actions"].map(h => (
                                        <th key={h} style={TH_STYLE}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [0, 1, 2, 3, 4].map(i => (
                                        <tr key={i}>
                                            {[0, 1, 2, 3, 4, 5].map(j => (
                                                <td key={j} style={{ padding: "14px 16px" }}>
                                                    <div className="skeleton" style={{ height: 12, borderRadius: 4, width: j === 5 ? "40%" : j === 0 ? "60%" : "50%" }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="empty-state">
                                                <div className="empty-state-icon"><ListOrdered size={18} color="var(--text-tertiary)" /></div>
                                                <p className="empty-state-title">Queue is empty</p>
                                                <p className="empty-state-desc">Add leads on the left or import a CSV to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : items.map(item => {
                                    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                                    const Icon = cfg.icon;
                                    const isEditing = editingId === item.id;

                                    return (
                                        <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                            {/* Name */}
                                            <td style={{ padding: "8px 16px" }}>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="field"
                                                        style={{ fontSize: 12, padding: "4px 8px", width: "100%" }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 500, fontSize: 13, color: item.lead_name ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                                                        {item.lead_name || "—"}
                                                    </span>
                                                )}
                                            </td>
                                            {/* Phone */}
                                            <td style={{ padding: "8px 16px" }}>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editPhone}
                                                        onChange={e => setEditPhone(e.target.value)}
                                                        className="field"
                                                        style={{ fontSize: 12, padding: "4px 8px", width: "100%", fontFamily: "monospace" }}
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 500, fontSize: 13, color: "var(--text-primary)", fontFamily: "monospace" }}>
                                                        {item.phone_number}
                                                    </span>
                                                )}
                                            </td>
                                            {/* Status */}
                                            <td>
                                                <span className="badge" style={{ background: cfg.bg, color: cfg.color, gap: 5 }}>
                                                    <Icon size={11} /> {cfg.label}
                                                </span>
                                            </td>
                                            {/* Attempts */}
                                            <td style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                                                {item.attempts}
                                            </td>
                                            {/* Added */}
                                            <td style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                                                {new Date(item.created_at).toLocaleString()}
                                            </td>
                                            {/* Actions */}
                                            <td style={{ padding: "8px 12px" }}>
                                                <div style={{ display: "flex", gap: 4 }}>
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => saveEdit(item)}
                                                                disabled={saving}
                                                                className="btn btn-ghost"
                                                                style={{ padding: "4px 6px", color: "var(--status-green)" }}
                                                                title="Save"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="btn btn-ghost"
                                                                style={{ padding: "4px 6px", color: "var(--text-tertiary)" }}
                                                                title="Cancel"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => startEdit(item)}
                                                                className="btn btn-ghost"
                                                                style={{ padding: "4px 6px", color: "var(--text-tertiary)" }}
                                                                title="Edit"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item)}
                                                                className="btn btn-ghost"
                                                                style={{ padding: "4px 6px", color: "var(--status-red)" }}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
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
