import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { leadsApi, type Lead, type PaginatedLeads } from "@/lib/api";
import { Users, Upload, Search, ChevronLeft, ChevronRight, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    new: { bg: "var(--accent-subtle)", text: "var(--accent)" },
    contacted: { bg: "var(--status-amber-bg)", text: "var(--status-amber)" },
    interested: { bg: "var(--status-green-bg)", text: "var(--status-green)" },
    not_interested: { bg: "var(--status-red-bg)", text: "var(--status-red)" },
    converted: { bg: "var(--status-cyan-bg)", text: "var(--status-cyan)" },
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

export const LeadsPage = () => {
    const navigate = useNavigate();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importMsg, setImportMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const limit = 20;

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const data: PaginatedLeads = await leadsApi.list(page, limit, statusFilter || undefined);
            setLeads(data.leads);
            setTotal(data.total);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLeads(); }, [page, statusFilter]);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setImportMsg(null);
        try {
            const res = await leadsApi.importCsv(file);
            setImportMsg({ type: "ok", text: res.message });
            fetchLeads();
        } catch (err: any) {
            setImportMsg({ type: "err", text: err.message });
        } finally {
            setImporting(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const totalPages = Math.ceil(total / limit);
    const filteredLeads = search
        ? leads.filter(l =>
            l.phone_number.includes(search) ||
            l.name?.toLowerCase().includes(search.toLowerCase()) ||
            l.location?.toLowerCase().includes(search.toLowerCase())
        )
        : leads;

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 32px" }}>

                {/* ── Header ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Leads</h1>
                        <p className="page-subtitle">
                            {total > 0 ? `${total} total leads` : "Manage your potential customers"}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: "none" }} id="csv-upload" />
                        <button
                            id="import-csv-btn"
                            onClick={() => fileRef.current?.click()}
                            disabled={importing}
                            className="btn btn-secondary"
                            style={{ gap: 6 }}
                        >
                            <Upload size={13} />
                            {importing ? "Importing…" : "Import CSV"}
                        </button>
                    </div>
                </div>

                {/* ── Alert ── */}
                {importMsg && (
                    <div className={`alert ${importMsg.type === "ok" ? "alert-success" : "alert-error"} animate-in`}>
                        {importMsg.type === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {importMsg.text}
                    </div>
                )}

                {/* ── Filters ── */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {/* Search */}
                    <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
                        <Search size={13} style={{
                            position: "absolute", left: 10, top: "50%",
                            transform: "translateY(-50%)", color: "var(--text-placeholder)",
                            pointerEvents: "none",
                        }} />
                        <input
                            id="leads-search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search name, phone, location…"
                            className="field"
                            style={{ paddingLeft: 30 }}
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="field"
                        style={{ width: "auto", paddingRight: 28, appearance: "auto" }}
                    >
                        <option value="">All Statuses</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="not_interested">Not Interested</option>
                        <option value="converted">Converted</option>
                    </select>
                </div>

                {/* ── Table ── */}
                <div className="card" style={{ overflow: "hidden" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                {["Phone Number", "Name", "Location", "Interest", "Status", "Updated", ""].map(h => (
                                    <th key={h} style={TH_STYLE}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [0, 1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>
                                        {[0, 1, 2, 3, 4, 5, 6].map(j => (
                                            <td key={j} style={{ padding: "14px 16px" }}>
                                                <div className="skeleton" style={{ height: 12, borderRadius: 4, width: j === 6 ? 16 : "70%" }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon"><Users size={18} color="var(--text-tertiary)" /></div>
                                            <p className="empty-state-title">No leads found</p>
                                            <p className="empty-state-desc">
                                                {search || statusFilter
                                                    ? "Try adjusting your filters."
                                                    : "Import a CSV file to add your first leads."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLeads.map(lead => {
                                const sc = STATUS_COLORS[lead.lead_status] ?? { bg: "var(--surface-inset)", text: "var(--text-secondary)" };
                                return (
                                    <tr
                                        key={lead.id}
                                        className="hover-row"
                                        onClick={() => navigate(`/leads/${lead.id}`)}
                                    >
                                        <td style={{ fontWeight: 500, fontSize: 13, color: "var(--text-primary)" }}>
                                            {lead.phone_number}
                                        </td>
                                        <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                            {lead.name ?? <span style={{ color: "var(--border-strong)" }}>—</span>}
                                        </td>
                                        <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                            {lead.location ?? <span style={{ color: "var(--border-strong)" }}>—</span>}
                                        </td>
                                        <td style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                                            {lead.insurance_interest ?? <span style={{ color: "var(--border-strong)" }}>—</span>}
                                        </td>
                                        <td>
                                            <span className="badge" style={{ background: sc.bg, color: sc.text, textTransform: "capitalize" }}>
                                                {lead.lead_status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                                            {new Date(lead.updated_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: "12px 12px 12px 0" }}>
                                            <ArrowRight size={14} color="var(--border-strong)" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <span className="pagination-info">
                                Page {page} of {totalPages} · {total} leads
                            </span>
                            <div style={{ display: "flex", gap: 4 }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="btn btn-secondary"
                                    style={{ padding: "5px 9px" }}
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="btn btn-secondary"
                                    style={{ padding: "5px 9px" }}
                                >
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
