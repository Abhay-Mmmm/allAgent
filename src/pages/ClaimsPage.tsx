import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

const allClaims = [
    { id: 'CLM-2024-001', name: 'Ramesh Kumar', type: 'Crop Failure', status: 'Under Review', amount: '₹25,000' },
    { id: 'CLM-2024-002', name: 'Sunita Devi', type: 'Medical', status: 'Approved', amount: '₹12,500' },
    { id: 'CLM-2024-003', name: 'Rajesh Singh', type: 'Property', status: 'Pending Docs', amount: '₹50,000' },
    { id: 'CLM-2024-004', name: 'Amit Patel', type: 'Crop Failure', status: 'Rejected', amount: '₹18,000' },
];

export const ClaimsPage = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const t = (key: string) => getTranslation(language, key);

    const handleSwitchToMobile = () => navigate('/mobile');

    const filteredClaims = allClaims.filter(claim => {
        const matchesSearch = claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            claim.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || claim.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statuses = ['All', 'Under Review', 'Approved', 'Pending Docs', 'Rejected'];

    return (
        <DashboardLayout activeTab="claims" onSwitchToMobile={handleSwitchToMobile}>
            <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-slate-900">{t('claimsManagement')}</h1>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder={t('searchClaims')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white font-medium text-slate-700 cursor-pointer relative"
                        >
                            {statuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Claims Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Claim ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Policy Holder</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClaims.length > 0 ? (
                                filteredClaims.map((claim) => (
                                    <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{claim.id}</td>
                                        <td className="px-6 py-4 text-slate-600">{claim.name}</td>
                                        <td className="px-6 py-4 text-slate-600">{claim.type}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${claim.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                                    claim.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                        claim.status === 'Pending Docs' ? 'bg-amber-100 text-amber-800' :
                                                            'bg-blue-100 text-blue-800'}`}>
                                                {claim.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{claim.amount}</td>
                                        <td className="px-6 py-4">
                                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No claims found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
};
