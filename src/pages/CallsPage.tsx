import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { callsApi, type CallSession } from "@/lib/api";
import { PhoneCall, Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

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

export const CallsPage = () => {
    const navigate = useNavigate();
    const [calls, setCalls] = useState<CallSession[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const limit = 20;

    useEffect(() => {
        setLoading(true);
        callsApi.list(page, limit)
            .then(data => { setCalls(data.calls); setTotal(data.total); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page]);

    const totalPages = Math.ceil(total / limit);

    const formatDuration = (secs: number | null) => {
        if (!secs) return "—";
        return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    };

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 32px" }}>

                {/* ── Header ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Call History</h1>
                        <p className="page-subtitle">
                            {total > 0 ? `${total} completed calls` : "Completed call recordings"}
                        </p>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="card" style={{ overflow: "hidden" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                {["Date & Time", "Lead Name", "Duration", "Insurance Interest", "VAPI Call ID", ""].map(h => (
                                    <th key={h} style={TH_STYLE}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [0, 1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>
                                        {[0, 1, 2, 3, 4, 5].map(j => (
                                            <td key={j} style={{ padding: "14px 16px" }}>
                                                <div className="skeleton" style={{ height: 12, borderRadius: 4, width: j === 0 ? "70%" : j === 5 ? 16 : "50%" }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : calls.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon">
                                                <PhoneCall size={18} color="var(--text-tertiary)" />
                                            </div>
                                            <p className="empty-state-title">No calls recorded yet</p>
                                            <p className="empty-state-desc">Start a campaign from the Queue page to begin calling leads.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : calls.map(call => (
                                <tr
                                    key={call.id}
                                    className="hover-row"
                                    onClick={() => navigate(`/calls/${call.id}`)}
                                >
                                    <td style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                                        {new Date(call.timestamp).toLocaleString()}
                                    </td>
                                    <td style={{ fontWeight: 500, fontSize: 13, color: "var(--text-primary)" }}>
                                        {call.structured_data?.name ?? <span style={{ color: "var(--text-tertiary)" }}>Unknown</span>}
                                    </td>
                                    <td>
                                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--text-secondary)" }}>
                                            <Clock size={12} color="var(--text-tertiary)" />
                                            {formatDuration(call.call_duration)}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                                        {call.structured_data?.insurance_interest ?? <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                                    </td>
                                    <td style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                                        {call.vapi_call_id?.slice(0, 14) ?? "—"}
                                    </td>
                                    <td style={{ padding: "12px 12px 12px 0" }}>
                                        <ArrowRight size={14} color="var(--border-strong)" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <span className="pagination-info">Page {page} of {totalPages} · {total} calls</span>
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
        </DashboardLayout>
    );
};
