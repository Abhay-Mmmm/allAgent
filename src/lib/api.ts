// ── Centralised API client for the Outbound AI Calling Platform ──────────────
// All requests go through this module. Base URL is read from VITE_API_BASE_URL.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error((error as any).detail || `API error ${response.status}`);
    }

    return response.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Lead {
    id: string;
    phone_number: string;
    name: string | null;
    age: number | null;
    occupation: string | null;
    location: string | null;
    insurance_interest: string | null;
    lead_status: string;
    last_summary: string | null;
    created_at: string;
    updated_at: string;
}

export interface CallSession {
    id: string;
    call_sid: string | null;
    lead_id: string;
    transcript: string;
    structured_data: Record<string, any> | null;
    call_duration: number | null;
    call_status: "completed" | "no_answer" | "busy" | "failed" | "canceled" | null;
    timestamp: string;
}

export interface QueueItem {
    id: string;
    phone_number: string;
    lead_name: string | null;
    status: "pending" | "calling" | "completed" | "no_answer" | "failed";
    attempts: number;
    created_at: string;
    updated_at: string;
}

export interface QueueStats {
    pending: number;
    calling: number;
    completed: number;
    no_answer: number;
    failed: number;
    total: number;
}

export interface PaginatedLeads {
    leads: Lead[];
    total: number;
    page: number;
    limit: number;
}

export interface PaginatedCalls {
    calls: CallSession[];
    total: number;
    page: number;
    limit: number;
}

export interface PaginatedQueue {
    items: QueueItem[];
    stats: QueueStats;
    total: number;
    page: number;
    limit: number;
}

// ── Leads API ─────────────────────────────────────────────────────────────────

export const leadsApi = {
    list: (page = 1, limit = 20, status?: string, phone?: string): Promise<PaginatedLeads> => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status) params.set("status", status);
        if (phone) params.set("phone", phone);
        return request(`/leads?${params}`);
    },

    get: (id: string): Promise<{ lead: Lead; call_sessions: CallSession[]; total_calls: number }> =>
        request(`/leads/${id}`),

    create: (data: { name?: string; phone_number: string }): Promise<Lead> =>
        request("/leads", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: { name?: string; phone_number?: string }): Promise<Lead> =>
        request(`/leads/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    delete: (id: string): Promise<void> =>
        fetch(`${BASE_URL}/leads/${id}`, { method: "DELETE" }).then(res => {
            if (!res.ok) throw new Error("Failed to delete lead");
        }),

    importCsv: (file: File): Promise<{ imported: number; updated: number; skipped: number; errors: number; message: string }> => {
        const formData = new FormData();
        formData.append("file", file);
        return request("/leads/import", {
            method: "POST",
            headers: {}, // let browser set multipart boundary
            body: formData,
        });
    },
};

// ── Queue API ─────────────────────────────────────────────────────────────────

export const queueApi = {
    list: (page = 1, limit = 50, status?: string): Promise<PaginatedQueue> => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status) params.set("status", status);
        return request(`/queue?${params}`);
    },

    stats: (): Promise<QueueStats> => request("/queue/stats"),

    add: (entries: { name?: string; phone_number: string }[]): Promise<{ message: string; added: number; skipped: number }> =>
        request("/queue/add", {
            method: "POST",
            body: JSON.stringify({ entries }),
        }),

    startCampaign: (): Promise<{ campaign_id: string; status: string; message: string }> =>
        request("/queue/start", { method: "POST" }),
};

// ── Calls API ─────────────────────────────────────────────────────────────────

export const callsApi = {
    list: (page = 1, limit = 20, lead_id?: string): Promise<PaginatedCalls> => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (lead_id) params.set("lead_id", lead_id);
        return request(`/calls?${params}`);
    },

    get: (id: string): Promise<{ call_session: CallSession; lead: Lead | null }> =>
        request(`/calls/${id}`),
};
