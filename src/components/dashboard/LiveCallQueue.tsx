import { Phone, PhoneForwarded } from 'lucide-react';

interface Call {
    id: string;
    callerId: string;
    duration: string;
    intent: string;
    aiConfidence: number;
    status: 'active' | 'handover';
}

const mockCalls: Call[] = [
    { id: '1', callerId: '+91 98*** 12345', duration: '02:14', intent: 'Crop Insurance Claim', aiConfidence: 98, status: 'active' },
    { id: '2', callerId: '+91 98*** 67890', duration: '00:45', intent: 'Policy Renewal', aiConfidence: 92, status: 'active' },
    { id: '3', callerId: '+91 98*** 11223', duration: '05:30', intent: 'Complaint / Grievance', aiConfidence: 65, status: 'handover' },
];

export const LiveCallQueue = () => {
    const activeCalls = mockCalls.filter(c => c.status === 'active').length;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm pb-2.5">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Live Call Queue (VAPI Integration)</h3>
                <span className="flex items-center gap-2 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                    LIVE {mockCalls.length} CALLS
                </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                            <th className="px-4 py-3 font-medium">Caller ID</th>
                            <th className="px-4 py-3 font-medium">Duration</th>
                            <th className="px-4 py-3 font-medium">Intent</th>
                            <th className="px-4 py-3 font-medium">AI Confidence</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockCalls.map((call) => (
                            <tr key={call.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-700 font-medium">{call.callerId}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-mono">{call.duration}</td>
                                <td className="px-4 py-3 text-slate-700">{call.intent}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${call.aiConfidence >= 80 ? 'bg-emerald-500' : call.aiConfidence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${call.aiConfidence}%` }}
                                            />
                                        </div>
                                        <span className="text-slate-600 text-sm">{call.aiConfidence}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {call.status === 'active' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">
                                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                                            ACTIVE AI
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                            <PhoneForwarded className="w-3 h-3" />
                                            HUMAN HANDOVER
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
