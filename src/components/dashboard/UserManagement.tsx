import { ExternalLink } from 'lucide-react';

interface User {
    id: string;
    name: string;
    location: string;
    kycStatus: 'verified' | 'pending';
    policyStatus: 'enrolled' | 'draft';
}

const mockUsers: User[] = [
    { id: '1', name: 'Ramesh Kumar', location: 'Village A, Bihar', kycStatus: 'verified', policyStatus: 'enrolled' },
    { id: '2', name: 'Sunita Devi', location: 'Village B, UP', kycStatus: 'pending', policyStatus: 'draft' },
    { id: '3', name: 'Rajesh Singh', location: 'Village C, MP', kycStatus: 'verified', policyStatus: 'enrolled' },
];

export const UserManagement = () => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">User Management & KYC</h3>
                <button className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors">
                    VIEW ALL
                    <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                            <th className="px-4 py-3 font-medium">User Name</th>
                            <th className="px-4 py-3 font-medium">Location</th>
                            <th className="px-4 py-3 font-medium">KYC Status</th>
                            <th className="px-4 py-3 font-medium">Policy Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockUsers.map((user) => (
                            <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-medium">{user.name}</td>
                                <td className="px-4 py-3 text-slate-600">{user.location}</td>
                                <td className="px-4 py-3">
                                    {user.kycStatus === 'verified' ? (
                                        <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                            VERIFIED DOC
                                        </span>
                                    ) : (
                                        <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                            PENDING DOC
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-600">{user.policyStatus === 'enrolled' ? 'Enrolled' : 'Draft'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
