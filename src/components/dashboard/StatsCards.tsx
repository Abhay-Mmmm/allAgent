import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { value: string; positive: boolean };
    icon?: React.ReactNode;
    accent?: 'default' | 'warning' | 'success';
}

const StatCard = ({ title, value, subtitle, trend, icon, accent = 'default' }: StatCardProps) => {
    const accentColors = {
        default: 'text-slate-900',
        warning: 'text-amber-600',
        success: 'text-emerald-600',
    };

    return (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${accentColors[accent]}`}>{value}</span>
                {icon}
            </div>
            {(subtitle || trend) && (
                <div className="mt-2 flex items-center gap-2">
                    {trend && (
                        <span className={`flex items-center gap-1 text-sm font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                            {trend.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {trend.value}
                        </span>
                    )}
                    {subtitle && <span className="text-slate-500 text-sm">{subtitle}</span>}
                </div>
            )}
        </div>
    );
};

export const StatsCards = () => {
    const { language } = useLanguage();
    const t = (key: string) => getTranslation(language, key);

    const stats = [
        {
            title: t('totalCalls'),
            value: '1,248',
            trend: { value: '↑ 12%', positive: true },
            subtitle: t('vsYesterday') || 'vs yesterday',
        },
        {
            title: t('activeUsers'),
            value: '8,502',
            trend: { value: '↑ 5%', positive: true },
            subtitle: t('thisWeek') || 'this week',
        },
        {
            title: t('newEnrollments'),
            value: '340',
            trend: { value: '↑ 8%', positive: true },
            subtitle: t('thisWeek') || 'this week',
        },
        {
            title: t('claimsOpen'),
            value: '42',
            subtitle: '⚠ Action Required',
            accent: 'warning' as const,
        },
        {
            title: t('successRate'),
            value: '94.5%',
            subtitle: 'AI Resolution Rate',
            accent: 'success' as const,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.map((stat) => (
                <StatCard key={stat.title} {...stat} />
            ))}
        </div>
    );
};
