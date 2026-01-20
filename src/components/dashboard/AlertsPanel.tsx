import { AlertTriangle, FileWarning } from 'lucide-react';

interface Alert {
    id: string;
    type: 'fraud' | 'kyc';
    title: string;
    description: string;
}

const mockAlerts: Alert[] = [
    { id: '1', type: 'fraud', title: 'Potential Fraud Detected', description: 'Claim #CL-2897 | Suspicious pattern' },
    { id: '2', type: 'kyc', title: 'Incomplete KYC Spike', description: 'Unusual drop in KYC in District A' },
];

export const AlertsPanel = () => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Alerts & Exceptions</h3>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                    2 HIGH RISK
                </span>
            </div>

            {/* Alerts List */}
            <div className="p-4 space-y-3">
                {mockAlerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`
              flex items-start gap-3 p-3 rounded-lg border
              ${alert.type === 'fraud'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-amber-50 border-amber-200'
                            }
            `}
                    >
                        <div className={`
              p-1.5 rounded
              ${alert.type === 'fraud' ? 'bg-red-100' : 'bg-amber-100'}
            `}>
                            {alert.type === 'fraud'
                                ? <AlertTriangle className="w-4 h-4 text-red-600" />
                                : <FileWarning className="w-4 h-4 text-amber-600" />
                            }
                        </div>
                        <div>
                            <p className={`font-medium text-sm ${alert.type === 'fraud' ? 'text-red-700' : 'text-amber-700'}`}>
                                {alert.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
