import { Language } from '@/types/chat';
import { getTranslation } from '@/lib/translations';
import { LanguageSelector } from '@/components/LanguageSelector';
import { MessageCircle, Shield, Leaf } from 'lucide-react';

interface LandingPageProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onStartChat: () => void;
}

export const LandingPage = ({ language, onLanguageChange, onStartChat }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header decoration */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/10 to-transparent" />
      
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
        {/* Logo/Icon */}
        <div className="mb-6 relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <Leaf className="absolute -right-2 -bottom-1 w-8 h-8 text-primary/60" />
        </div>

        {/* App name */}
        <h1 className="text-accessible-2xl font-bold text-foreground text-center mb-2">
          {getTranslation(language, 'appName')}
        </h1>

        {/* Tagline */}
        <p className="text-accessible-lg text-muted-foreground text-center mb-10 max-w-xs">
          {getTranslation(language, 'tagline')}
        </p>

        {/* Language selector */}
        <div className="w-full max-w-xs mb-8">
          <p className="text-accessible-sm text-muted-foreground text-center mb-3">
            {getTranslation(language, 'selectLanguage')}
          </p>
          <LanguageSelector
            currentLanguage={language}
            onLanguageChange={onLanguageChange}
          />
        </div>

        {/* Start chat button */}
        <button
          onClick={onStartChat}
          className="
            w-full max-w-xs flex items-center justify-center gap-3
            py-5 px-8 rounded-2xl
            bg-accent text-accent-foreground
            text-accessible-xl font-semibold
            shadow-lg shadow-accent/25
            hover:shadow-xl hover:shadow-accent/30
            active:scale-[0.98]
            transition-all duration-200
          "
          aria-label={getTranslation(language, 'startChat')}
        >
          <MessageCircle className="w-7 h-7" />
          {getTranslation(language, 'startChat')}
        </button>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-accessible-sm text-muted-foreground">
          🌾 Made for rural India
        </p>
      </footer>
    </div>
  );
};
