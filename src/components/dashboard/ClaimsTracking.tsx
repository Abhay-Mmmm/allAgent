interface Claim {
    id: string;
    claimId: string;
    type: string;
    submitted: string;
    processing: string;
    status: 'verifying' | 'approved' | 'pending';
}

const mockClaims: Claim[] = [
    { id: '1', claimId: '#CLM-2024-001', type: 'Crop Damage', submitted: '2 hrs ago', processing: 'Auto-Processing', status: 'verifying' },
    { id: '2', claimId: '#CLM-2024-002', type: 'Health Emergency', submitted: '1 day ago', processing: '24h', status: 'approved' },
];

export const ClaimsTracking = () => {
    const getStatusBadge = (status: Claim['status']) => {
        const styles = {
            verifying: 'bg-cyan-100 text-cyan-700',
            approved: 'bg-emerald-100 text-emerald-700',
            pending: 'bg-amber-100 text-amber-700',
        };
        const labels = {
            verifying: 'VERIFYING',
            approved: 'APPROVED',
            pending: 'PENDING',
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Recent Claims Tracking</h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                            <th className="px-4 py-3 font-medium">Claim ID</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Submitted</th>
                            <th className="px-4 py-3 font-medium">Processing</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockClaims.map((claim) => (
                            <tr key={claim.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-medium">{claim.claimId}</td>
                                <td className="px-4 py-3 text-slate-600">{claim.type}</td>
                                <td className="px-4 py-3 text-slate-500">{claim.submitted}</td>
                                <td className="px-4 py-3 text-slate-600">{claim.processing}</td>
                                <td className="px-4 py-3">{getStatusBadge(claim.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
