import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { queueApi, callsApi, leadsApi, type QueueStats, type CallSession, type Lead } from "@/lib/api";
import {
    PhoneCall, Users, CheckCircle, Clock, ListOrdered, Play,
    ArrowRight, Phone, RefreshCw, AlertCircle, XCircle
} from "lucide-react";

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = ({
    label, value, icon: Icon, color, bg, trend
}: {
    label: string; value: string | number; icon: any;
    color: string; bg: string; trend?: string;
}) => (
    <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
            </span>
            <div style={{
                width: 30, height: 30, borderRadius: "var(--r-md)",
                background: bg,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Icon size={15} color={color} />
            </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {value}
        </div>
        {trend && (
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{trend}</span>
        )}
    </div>
);

/* ─── Section Card ───────────────────────────────────────────────────────── */
const SectionCard = ({ title, icon: Icon, action, actionLabel, children }: {
    title: string; icon?: any; action?: () => void; actionLabel?: string; children: React.ReactNode;
}) => (
    <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {Icon && <Icon size={14} color="var(--text-tertiary)" />}
                <span className="card-title">{title}</span>
            </div>
            {action && (
                <button
                    onClick={action}
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "3px 8px", color: "var(--accent)", gap: 3 }}
                >
                    {actionLabel ?? "View all"} <ArrowRight size={12} />
                </button>
            )}
        </div>
        {children}
    </div>
);

/* ─── Row Item ───────────────────────────────────────────────────────────── */
const ListRow = ({ primary, secondary, meta, badge, badgeColor, badgeBg, onClick }: {
    primary: string; secondary?: string; meta?: string;
    badge?: string; badgeColor?: string; badgeBg?: string;
    onClick?: () => void;
}) => (
    <div
        onClick={onClick}
        style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            cursor: onClick ? "pointer" : "default",
            transition: "background var(--t-fast)",
        }}
        onMouseEnter={e => { if (onClick) e.currentTarget.style.background = "var(--surface-inset)"; }}
        onMouseLeave={e => { if (onClick) e.currentTarget.style.background = "transparent"; }}
    >
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {primary}
            </div>
            {secondary && (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 1 }}>{secondary}</div>
            )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
            {meta && <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{meta}</span>}
            {badge && (
                <span className="badge" style={{ background: badgeBg ?? "var(--surface-inset)", color: badgeColor ?? "var(--text-secondary)", textTransform: "capitalize" }}>
                    {badge}
                </span>
            )}
            {onClick && <ArrowRight size={14} color="var(--border-strong)" />}
        </div>
    </div>
);

/* ─── Skeleton Loader ────────────────────────────────────────────────────── */
const SkeletonRow = () => (
    <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 12, alignItems: "center" }}>
        <div className="skeleton" style={{ height: 12, width: "55%", borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 12, width: "25%", borderRadius: 4, marginLeft: "auto" }} />
    </div>
);

/* ─── Status colors ──────────────────────────────────────────────────────── */
const STATUS: Record<string, { color: string; bg: string }> = {
    new: { color: "var(--accent)", bg: "var(--accent-subtle)" },
    contacted: { color: "var(--status-amber)", bg: "var(--status-amber-bg)" },
    interested: { color: "var(--status-green)", bg: "var(--status-green-bg)" },
    not_interested: { color: "var(--status-red)", bg: "var(--status-red-bg)" },
    converted: { color: "var(--status-cyan)", bg: "var(--status-cyan-bg)" },
};

/* ─── Page ───────────────────────────────────────────────────────────────── */
export const DashboardPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [recentCalls, setRecentCalls] = useState<CallSession[]>([]);
    const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [campaignLoading, setCampaignLoading] = useState(false);
    const [campaignMessage, setCampaignMessage] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [qStats, callsData, leadsData] = await Promise.all([
                queueApi.stats(),
                callsApi.list(1, 5),
                leadsApi.list(1, 5),
            ]);
            setStats(qStats);
            setRecentCalls(callsData.calls);
            setRecentLeads(leadsData.leads);
        } catch (e) {
            console.error("Error fetching dashboard data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleStartCampaign = async () => {
        setCampaignLoading(true);
        setCampaignMessage("");
        try {
            const res = await queueApi.startCampaign();
            setCampaignMessage(`Campaign ${res.campaign_id.slice(0, 8)}… started successfully.`);
            setTimeout(() => setCampaignMessage(""), 6000);
            fetchData();
        } catch (e: any) {
            setCampaignMessage(`Error: ${e.message}`);
        } finally {
            setCampaignLoading(false);
        }
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "—";
        const m = Math.floor(seconds / 60), s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const statCards = [
        { label: "Total Queue", value: stats?.total ?? 0, icon: ListOrdered, color: "var(--accent)", bg: "var(--accent-subtle)" },
        { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "var(--status-amber)", bg: "var(--status-amber-bg)", trend: "Ready to dial" },
        { label: "Active Calls", value: stats?.calling ?? 0, icon: Phone, color: "var(--status-cyan)", bg: "var(--status-cyan-bg)", trend: "In progress" },
        { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle, color: "var(--status-green)", bg: "var(--status-green-bg)" },
        { label: "Failed", value: stats?.failed ?? 0, icon: XCircle, color: "var(--status-red)", bg: "var(--status-red-bg)" },
    ];

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 32px" }}>

                {/* ── Page Header ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Outbound AI calling campaign overview</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                            id="refresh-dashboard"
                            onClick={fetchData}
                            disabled={loading}
                            className="btn btn-secondary"
                            style={{ gap: 6 }}
                        >
                            <RefreshCw size={13} style={{ opacity: loading ? 0.5 : 1 }} />
                            Refresh
                        </button>
                        <button
                            id="start-campaign-btn"
                            onClick={handleStartCampaign}
                            disabled={campaignLoading}
                            className="btn btn-primary"
                            style={{ gap: 6, padding: "7px 14px" }}
                        >
                            <Play size={13} />
                            {campaignLoading ? "Starting…" : "Start Campaign"}
                        </button>
                    </div>
                </div>

                {/* ── Campaign message ── */}
                {campaignMessage && (
                    <div className={`alert ${campaignMessage.startsWith("Error") ? "alert-error" : "alert-success"} animate-in`}>
                        {campaignMessage.startsWith("Error") ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                        {campaignMessage}
                    </div>
                )}

                {/* ── Stat Cards ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
                    {loading
                        ? statCards.map((_, i) => <div key={i} className="card skeleton" style={{ height: 100 }} />)
                        : statCards.map(card => <StatCard key={card.label} {...card} />)
                    }
                </div>

                {/* ── Two-column ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                    {/* Recent Calls */}
                    <SectionCard title="Recent Calls" icon={PhoneCall} action={() => navigate("/calls")} actionLabel="View all">
                        {loading ? (
                            [0, 1, 2, 3].map(i => <SkeletonRow key={i} />)
                        ) : recentCalls.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><PhoneCall size={18} color="var(--text-tertiary)" /></div>
                                <p className="empty-state-title">No calls yet</p>
                                <p className="empty-state-desc">Start a campaign to begin calling leads.</p>
                            </div>
                        ) : recentCalls.map(call => (
                            <ListRow
                                key={call.id}
                                primary={call.structured_data?.name ?? "Unknown Lead"}
                                secondary={new Date(call.timestamp).toLocaleString()}
                                meta={formatDuration(call.call_duration)}
                                onClick={() => navigate(`/calls/${call.id}`)}
                            />
                        ))}
                    </SectionCard>

                    {/* Recent Leads */}
                    <SectionCard title="Recent Leads" icon={Users} action={() => navigate("/leads")} actionLabel="View all">
                        {loading ? (
                            [0, 1, 2, 3].map(i => <SkeletonRow key={i} />)
                        ) : recentLeads.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><Users size={18} color="var(--text-tertiary)" /></div>
                                <p className="empty-state-title">No leads yet</p>
                                <p className="empty-state-desc">Import a CSV file to get started.</p>
                            </div>
                        ) : recentLeads.map(lead => {
                            const sc = STATUS[lead.lead_status];
                            return (
                                <ListRow
                                    key={lead.id}
                                    primary={lead.name ?? lead.phone_number}
                                    secondary={[lead.phone_number, lead.location].filter(Boolean).join(" · ")}
                                    badge={lead.lead_status.replace("_", " ")}
                                    badgeColor={sc?.color}
                                    badgeBg={sc?.bg}
                                    onClick={() => navigate(`/leads/${lead.id}`)}
                                />
                            );
                        })}
                    </SectionCard>

                </div>
            </div>
        </DashboardLayout>
    );
};
