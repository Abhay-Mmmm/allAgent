import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { callsApi, type CallSession, type Lead } from "@/lib/api";
import { ArrowLeft, Clock, User, Phone, MapPin, Heart, Briefcase, ChevronRight, PhoneCall } from "lucide-react";

/* ─── Sub-components ─────────────────────────────────────────────────────── */
const MetaRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "7px 0",
        borderBottom: "1px solid var(--border-subtle)",
        gap: 12,
    }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", flexShrink: 0 }}>{label}</span>
        <span style={{
            fontSize: 13,
            fontWeight: value ? 500 : 400,
            color: value ? "var(--text-primary)" : "var(--border-strong)",
            textAlign: "right",
            textTransform: "capitalize",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "55%",
        }}>
            {value ?? "—"}
        </span>
    </div>
);

const FieldRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => (
    <div style={{ display: "flex", gap: 10, marginBottom: 11 }}>
        <Icon size={13} color="var(--text-tertiary)" style={{ marginTop: 3, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
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
export const CallDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<CallSession | null>(null);
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        callsApi.get(id)
            .then(data => { setSession(data.call_session); setLead(data.lead); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <DashboardLayout>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
                    <div className="skeleton" style={{ width: 60, height: 28, borderRadius: "var(--r-md)" }} />
                    <div className="skeleton" style={{ width: 200, height: 18, borderRadius: 4 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div className="card skeleton" style={{ height: 200 }} />
                        <div className="card skeleton" style={{ height: 140 }} />
                    </div>
                    <div className="card skeleton" style={{ height: 440 }} />
                </div>
            </div>
        </DashboardLayout>
    );

    if (!session) return (
        <DashboardLayout>
            <div style={{ padding: "60px 32px", textAlign: "center" }}>
                <div className="empty-state">
                    <div className="empty-state-icon"><PhoneCall size={18} color="var(--text-tertiary)" /></div>
                    <p className="empty-state-title">Call session not found</p>
                    <button onClick={() => navigate("/calls")} className="btn btn-secondary" style={{ marginTop: 12 }}>
                        <ArrowLeft size={13} /> Back to Calls
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );

    const extracted = session.structured_data ?? {};
    const duration = session.call_duration
        ? `${Math.floor(session.call_duration / 60)}m ${session.call_duration % 60}s`
        : "—";

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>

                {/* ── Breadcrumb / Header ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                    <button
                        id="back-to-calls"
                        onClick={() => navigate("/calls")}
                        className="btn btn-secondary"
                        style={{ gap: 5, padding: "5px 10px" }}
                    >
                        <ArrowLeft size={13} /> Calls
                    </button>
                    <ChevronRight size={14} color="var(--text-tertiary)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {extracted.name ?? lead?.phone_number ?? "Unknown Lead"}
                        </h1>
                        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                            {new Date(session.timestamp).toLocaleString()} · {duration}
                        </p>
                    </div>
                </div>

                {/* ── Two-column ── */}
                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>

                    {/* Left column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                        {/* Lead Profile */}
                        <div className="card" style={{ padding: "16px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                                Lead Profile
                            </div>
                            <FieldRow icon={Phone} label="Phone" value={lead?.phone_number} />
                            <FieldRow icon={User} label="Name" value={extracted.name ?? lead?.name} />
                            <FieldRow icon={Briefcase} label="Occupation" value={extracted.occupation ?? lead?.occupation} />
                            <FieldRow icon={MapPin} label="Location" value={extracted.location ?? lead?.location} />
                            <FieldRow icon={Heart} label="Interest" value={extracted.insurance_interest ?? lead?.insurance_interest} />
                        </div>

                        {/* Call Details */}
                        <div className="card" style={{ padding: "16px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                                Call Details
                            </div>
                            <MetaRow label="Duration" value={duration} />
                            <MetaRow label="Date" value={new Date(session.timestamp).toLocaleDateString()} />
                            <MetaRow label="Outcome" value={extracted.lead_status} />
                            <MetaRow label="VAPI ID" value={session.vapi_call_id?.slice(0, 18)} />
                        </div>

                        {/* AI Summary */}
                        {extracted.summary && (
                            <div style={{
                                borderRadius: "var(--r-xl)",
                                padding: "16px",
                                background: "var(--accent-subtle)",
                                border: "1px solid var(--accent-muted)",
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                                    AI Summary
                                </div>
                                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.65 }}>
                                    {extracted.summary}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Transcript */}
                    <div className="card" style={{ overflow: "hidden" }}>
                        <div className="card-header">
                            <span className="card-title">Full Transcript</span>
                            <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock size={11} /> {duration}
                            </span>
                        </div>

                        <div style={{ padding: "16px 20px" }}>
                            {session.transcript ? (
                                <div style={{ maxHeight: 560, overflowY: "auto" }}>
                                    {session.transcript.split("\n").map((line, i) => {
                                        const isAI = line.startsWith("Assistant:");
                                        const isUser = line.startsWith("User:") || line.startsWith("Customer:");
                                        if (!line.trim()) return null;
                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    marginBottom: 8,
                                                    padding: "8px 12px",
                                                    borderRadius: "var(--r-md)",
                                                    fontSize: 13,
                                                    lineHeight: 1.65,
                                                    fontFamily: "var(--font-sans)",
                                                    background: isAI ? "var(--accent-subtle)" : isUser ? "var(--status-green-bg)" : "transparent",
                                                    color: isAI ? "var(--accent)" : isUser ? "var(--status-green)" : "var(--text-secondary)",
                                                    fontWeight: isAI || isUser ? 500 : 400,
                                                    borderLeft: isAI ? "2px solid var(--accent-muted)" : isUser ? "2px solid #bbf7d0" : "none",
                                                    paddingLeft: isAI || isUser ? 12 : 12,
                                                }}
                                            >
                                                {line}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state" style={{ padding: "48px 0" }}>
                                    <div className="empty-state-icon"><PhoneCall size={16} color="var(--text-tertiary)" /></div>
                                    <p className="empty-state-title">No transcript available</p>
                                    <p className="empty-state-desc">The transcript for this call was not recorded.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};
