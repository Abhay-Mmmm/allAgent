import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { LiveCallQueue } from '@/components/dashboard/LiveCallQueue';
import { UserManagement } from '@/components/dashboard/UserManagement';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { AIRecommendations } from '@/components/dashboard/AIRecommendations';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = (key: string) => getTranslation(language, key);

    const handleSwitchToMobile = () => {
        navigate('/mobile');
    };

    return (
        <DashboardLayout activeTab="dashboard" onSwitchToMobile={handleSwitchToMobile}>
            <div className="p-6 space-y-6 h-full">
                {/* Page Title */}
                <h1 className="text-2xl font-bold text-slate-900">{t('overview')}</h1>

                {/* Stats Row */}
                <StatsCards />

                {/* Main Grid - Row 1: Live Calls full width */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8">
                        <LiveCallQueue />
                    </div>
                    <div className="xl:col-span-4">
                        <AlertsPanel />
                    </div>
                </div>

                {/* Main Grid - Row 2: User Management + AI Recommendations */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8">
                        <UserManagement />
                    </div>
                    <div className="xl:col-span-4">
                        <AIRecommendations />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
