import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { ModeSelector } from '@/components/ModeSelector';
import { Shield } from 'lucide-react';
import { getTranslation } from '@/lib/translations';

export const ModeSelectionPage = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();

    const handleModeSelect = (mode: 'web' | 'mobile') => {
        if (mode === 'web') {
            navigate('/dashboard');
        } else {
            navigate('/mobile');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl gradient-card flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold text-foreground">
                        {getTranslation(language, 'appName')}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col justify-center px-6 py-8">
                <ModeSelector
                    onSelectMode={handleModeSelect}
                    language={language}
                />
            </main>

            {/* Footer */}
            <footer className="px-6 pb-6 text-center">
                <p className="text-sm text-muted-foreground">
                    🌾 Insurance information for rural India
                </p>
            </footer>
        </div>
    );
};
