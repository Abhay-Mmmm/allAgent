import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { leadsApi, type Lead, type CallSession } from "@/lib/api";
import { ArrowLeft, User, Phone, MapPin, Briefcase, Heart, Clock, PhoneCall, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    new: { bg: "var(--accent-subtle)", text: "var(--accent)" },
    contacted: { bg: "var(--status-amber-bg)", text: "var(--status-amber)" },
    interested: { bg: "var(--status-green-bg)", text: "var(--status-green)" },
    not_interested: { bg: "var(--status-red-bg)", text: "var(--status-red)" },
    converted: { bg: "var(--status-cyan-bg)", text: "var(--status-cyan)" },
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */
const InfoRow = ({
    icon: Icon, label, value
}: { icon: any; label: string; value: string | null | undefined }) => (
    <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
    }}>
        <div style={{
            width: 28,
            height: 28,
            borderRadius: "var(--r-md)",
            background: "var(--surface-inset)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
        }}>
            <Icon size={13} color="var(--text-tertiary)" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
            </div>
            <div style={{ fontSize: 13, color: value ? "var(--text-primary)" : "var(--border-strong)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {value ?? "—"}
            </div>
        </div>
    </div>
);

/* ─── Page ───────────────────────────────────────────────────────────────── */
export const LeadDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<Lead | null>(null);
    const [sessions, setSessions] = useState<CallSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        leadsApi.get(id)
            .then(data => {
                setLead(data.lead);
                setSessions(data.call_sessions);
                if (data.call_sessions.length > 0) setSelectedSession(data.call_sessions[0]);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <DashboardLayout>
            <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto" }}>
                {/* Skeleton header */}
                <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "center" }}>
                    <div className="skeleton" style={{ width: 60, height: 30, borderRadius: "var(--r-md)" }} />
                    <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: 18, width: 200, borderRadius: 4, marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 12, width: 140, borderRadius: 4 }} />
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
                    <div className="card skeleton" style={{ height: 360 }} />
                    <div className="card skeleton" style={{ height: 360 }} />
                </div>
            </div>
        </DashboardLayout>
    );

    if (!lead) return (
        <DashboardLayout>
            <div style={{ padding: "60px 32px", textAlign: "center" }}>
                <div className="empty-state">
                    <div className="empty-state-icon"><User size={20} color="var(--text-tertiary)" /></div>
                    <p className="empty-state-title">Lead not found</p>
                    <p className="empty-state-desc">This lead may have been removed.</p>
                    <button onClick={() => navigate("/leads")} className="btn btn-secondary" style={{ marginTop: 12 }}>
                        <ArrowLeft size={13} /> Back to Leads
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );

    const sc = STATUS_COLORS[lead.lead_status] ?? { bg: "var(--surface-inset)", text: "var(--text-secondary)" };
    const avatar = (lead.name?.[0] ?? lead.phone_number?.[1] ?? "?").toUpperCase();

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 32px" }}>

                {/* ── Breadcrumb / Header ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <button
                        id="back-to-leads"
                        onClick={() => navigate("/leads")}
                        className="btn btn-secondary"
                        style={{ gap: 5, padding: "5px 10px" }}
                    >
                        <ArrowLeft size={13} /> Leads
                    </button>
                    <ChevronRight size={14} color="var(--text-tertiary)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                                {lead.name ?? lead.phone_number}
                            </h1>
                            <span className="badge" style={{ background: sc.bg, color: sc.text, textTransform: "capitalize" }}>
                                {lead.lead_status.replace("_", " ")}
                            </span>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                            {lead.phone_number} · {sessions.length} call{sessions.length !== 1 ? "s" : ""} recorded
                        </p>
                    </div>
                </div>

                {/* ── Grid ── */}
                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>

                    {/* Profile card */}
                    <div className="card" style={{ padding: "20px", overflow: "hidden" }}>
                        {/* Avatar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "var(--accent)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                fontWeight: 700,
                                color: "#fff",
                                flexShrink: 0,
                                letterSpacing: "-0.02em",
                            }}>
                                {avatar}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {lead.name ?? "Unknown"}
                                </div>
                                <div style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 1 }}>
                                    {sessions.length} call{sessions.length !== 1 ? "s" : ""}
                                </div>
                            </div>
                        </div>

                        <InfoRow icon={Phone} label="Phone" value={lead.phone_number} />
                        <InfoRow icon={User} label="Age" value={lead.age ? `${lead.age} years` : null} />
                        <InfoRow icon={Briefcase} label="Occupation" value={lead.occupation} />
                        <InfoRow icon={MapPin} label="Location" value={lead.location} />
                        <InfoRow icon={Heart} label="Insurance Interest" value={lead.insurance_interest} />

                        {lead.last_summary && (
                            <div style={{ marginTop: 14, padding: "12px", borderRadius: "var(--r-md)", background: "var(--accent-subtle)", border: "1px solid var(--accent-muted)" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                                    Last Summary
                                </div>
                                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                                    {lead.last_summary}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Call History + Transcript */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                        {/* Call list */}
                        <div className="card" style={{ overflow: "hidden" }}>
                            <div className="card-header">
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <PhoneCall size={14} color="var(--text-tertiary)" />
                                    <span className="card-title">Call History</span>
                                </div>
                                <span className="badge" style={{ background: "var(--surface-inset)", color: "var(--text-tertiary)" }}>
                                    {sessions.length}
                                </span>
                            </div>

                            {sessions.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon"><PhoneCall size={16} color="var(--text-tertiary)" /></div>
                                    <p className="empty-state-title">No calls yet</p>
                                    <p className="empty-state-desc">This lead hasn't been called yet.</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                                    {sessions.map(session => {
                                        const isActive = selectedSession?.id === session.id;
                                        return (
                                            <div
                                                key={session.id}
                                                onClick={() => setSelectedSession(session)}
                                                style={{
                                                    padding: "11px 20px",
                                                    borderBottom: "1px solid var(--border-subtle)",
                                                    cursor: "pointer",
                                                    transition: "background var(--t-fast)",
                                                    background: isActive ? "var(--accent-subtle)" : "transparent",
                                                    borderLeft: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
                                                    paddingLeft: isActive ? 18 : 20,
                                                }}
                                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--surface-inset)"; }}
                                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? "var(--accent)" : "var(--text-primary)" }}>
                                                        {new Date(session.timestamp).toLocaleString()}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
                                                        <Clock size={11} />
                                                        {session.call_duration
                                                            ? `${Math.floor(session.call_duration / 60)}m ${session.call_duration % 60}s`
                                                            : "—"}
                                                    </span>
                                                </div>
                                                {session.structured_data?.lead_status && (
                                                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 3, textTransform: "capitalize" }}>
                                                        Outcome: {session.structured_data.lead_status}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Transcript */}
                        {selectedSession && (
                            <div className="card animate-in" style={{ overflow: "hidden" }}>
                                <div className="card-header">
                                    <span className="card-title">Call Transcript</span>
                                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                                        {new Date(selectedSession.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ padding: "16px 20px" }}>
                                    {selectedSession.transcript ? (
                                        <div style={{ maxHeight: 380, overflowY: "auto" }}>
                                            {selectedSession.transcript.split("\n").map((line, i) => {
                                                const isAI = line.startsWith("Assistant:");
                                                const isUser = line.startsWith("User:") || line.startsWith("Customer:");
                                                return (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            marginBottom: 6,
                                                            padding: "7px 10px",
                                                            borderRadius: "var(--r-md)",
                                                            fontSize: 13,
                                                            lineHeight: 1.6,
                                                            fontFamily: "var(--font-sans)",
                                                            background: isAI ? "var(--accent-subtle)" : isUser ? "var(--status-green-bg)" : "transparent",
                                                            color: isAI ? "var(--accent)" : isUser ? "var(--status-green)" : "var(--text-secondary)",
                                                            fontWeight: isAI || isUser ? 500 : 400,
                                                        }}
                                                    >
                                                        {line}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="empty-state" style={{ padding: "32px 0" }}>
                                            <p className="empty-state-desc">No transcript available for this call.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
