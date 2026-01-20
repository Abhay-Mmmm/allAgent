import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ClipboardList,
    Settings,
    ChevronLeft,
    ChevronRight,
    Smartphone
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface DashboardLayoutProps {
    children: ReactNode;
    activeTab?: string;
    onTabChange?: (id: string) => void;
    onSwitchToMobile?: () => void;
}

export const DashboardLayout = ({
    children,
    activeTab = 'dashboard',
    onTabChange,
    onSwitchToMobile,
}: DashboardLayoutProps) => {
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem('sidebarCollapsed') === 'true';
        } catch (e) {
            return false;
        }
    });

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(collapsed));
    }, [collapsed]);

    const navigate = useNavigate();
    const { language } = useLanguage();

    const t = (key: string) => getTranslation(language, key);

    const navItems = [
        { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { id: 'claims', label: t('claims'), icon: ClipboardList },
        { id: 'settings', label: t('settings'), icon: Settings },
    ];

    const handleNavigation = (id: string) => {
        if (id === 'dashboard') navigate('/dashboard');
        else if (id === 'claims') navigate('/dashboard/claims');
        else if (id === 'settings') navigate('/dashboard/settings');
        onTabChange?.(id);
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Sidebar */}
            <aside className={`${collapsed ? 'w-20' : 'w-56'} bg-slate-900 text-white flex flex-col transition-all duration-300 relative sticky top-0 h-screen`}>

                {/* Logo Area & Toggle */}
                <div className="p-4 border-b border-slate-700 relative flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${collapsed ? 'justify-center w-full' : ''}`}>
                        <div className="w-8 h-8 min-w-[32px] rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">A</span>
                        </div>
                        {!collapsed && <span className="font-bold text-lg tracking-tight truncate">allAgent</span>}
                    </div>

                    {/* Toggle Button - Absolute positioned relative to logo area */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`
                            bg-slate-800 rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors
                            ${collapsed ? 'absolute -right-3 top-6 shadow-lg bg-cyan-600 text-white hover:bg-cyan-500' : ''}
                        `}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
                    {navItems.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => handleNavigation(id)}
                            className={`
                                w-full flex items-center text-sm font-medium rounded-lg
                                transition-all duration-200
                                ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3'}
                                ${activeTab === id
                                    ? 'bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-400'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }
                            `}
                            title={collapsed ? label : undefined}
                        >
                            <Icon className="w-5 h-5 min-w-[20px]" />
                            {!collapsed && <span className="truncate">{label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Mobile App Switch */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={onSwitchToMobile}
                        className={`
                            w-full flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg
                             ${collapsed ? 'p-3' : 'gap-2 px-4 py-3'}
                        `}
                        title={collapsed ? t('switchToMobile') : undefined}
                    >
                        <Smartphone className="w-5 h-5" />
                        {!collapsed && <span className="font-medium">{t('switchToMobile')}</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="h-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
