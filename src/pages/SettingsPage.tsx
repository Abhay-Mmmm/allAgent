import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { User, Bell, Lock, Globe, Shield } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

export const SettingsPage = () => {
    const navigate = useNavigate();
    const { language, setLanguage } = useLanguage();
    const [fullName, setFullName] = useState('Admin Operator');

    const t = (key: string) => getTranslation(language, key);

    const handleSwitchToMobile = () => navigate('/mobile');

    return (
        <DashboardLayout activeTab="settings" onSwitchToMobile={handleSwitchToMobile}>
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                <h1 className="text-2xl font-bold text-slate-900">{t('settings')}</h1>

                {/* Profile Section */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" />
                            {t('profileSettings')}
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                                {fullName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 text-lg">{fullName}</h3>
                                <p className="text-slate-500">admin@allagent.ai</p>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                    {t('superAdmin')}
                                </span>
                                <div className="mt-2">
                                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Change Avatar</button>
                                </div>
                            </div>
                        </div>
                        <div className="max-w-md">
                            <label className="text-sm font-medium text-slate-700 block mb-2">{t('fullName')}</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </section>

                {/* Preferences */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-600" />
                            {t('preferences')}
                        </h2>
                    </div>
                    <div className="p-6 divide-y divide-slate-100">
                        <div className="py-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">{t('language')}</h3>
                                <p className="text-sm text-slate-500">Select dashboard language preference</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${language === 'en' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {t('english')}
                                </button>
                                <button
                                    onClick={() => setLanguage('hi')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${language === 'hi' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {t('hindi')}
                                </button>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Security */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            {t('security')}
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <button className="flex items-center gap-2 text-slate-700 hover:text-blue-600 font-medium">
                            <Lock className="w-4 h-4" />
                            {t('changePassword')}
                        </button>
                        <button className="flex items-center gap-2 text-slate-700 hover:text-blue-600 font-medium">
                            <Bell className="w-4 h-4" />
                            {t('notificationSettings')}
                        </button>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
};
