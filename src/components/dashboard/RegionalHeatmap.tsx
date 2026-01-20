import { ExternalLink } from 'lucide-react';

export const RegionalHeatmap = () => {
    // Simplified India map representation with activity dots
    const regions = [
        { id: 1, x: 35, y: 25, activity: 'high' },
        { id: 2, x: 55, y: 35, activity: 'medium' },
        { id: 3, x: 70, y: 50, activity: 'low' },
        { id: 4, x: 45, y: 60, activity: 'high' },
        { id: 5, x: 60, y: 70, activity: 'medium' },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Regional Activity Heatmap</h3>
                <button className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors">
                    LIVE DATA
                    <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            {/* Map visualization */}
            <div className="p-4 flex items-center justify-center">
                <div className="relative w-48 h-48 bg-slate-50 rounded-lg border border-slate-200">
                    {/* Simple India outline placeholder */}
                    <div className="absolute inset-4 opacity-20">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-400">
                            <path
                                fill="currentColor"
                                d="M50 5 L75 20 L80 45 L70 70 L55 85 L40 80 L25 60 L20 35 L35 15 Z"
                            />
                        </svg>
                    </div>

                    {/* Activity dots */}
                    {regions.map((region) => (
                        <div
                            key={region.id}
                            className={`
                absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2
                ${region.activity === 'high'
                                    ? 'bg-red-500 animate-pulse'
                                    : region.activity === 'medium'
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                }
              `}
                            style={{ left: `${region.x}%`, top: `${region.y}%` }}
                        />
                    ))}

                    {/* Map label */}
                    <div className="absolute bottom-2 left-2 text-xs text-slate-400 font-mono">
                        {'< GEO_GRID_VIEW />'}
                    </div>
                </div>
            </div>
        </div>
    );
};
