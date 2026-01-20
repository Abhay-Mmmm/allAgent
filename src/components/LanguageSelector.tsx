import { Language } from '@/types/chat';
import { getTranslation } from '@/lib/translations';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export const LanguageSelector = ({ currentLanguage, onLanguageChange }: LanguageSelectorProps) => {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onLanguageChange('en')}
        className={`
          flex-1 py-4 px-6 rounded-lg text-accessible-lg font-medium
          transition-all duration-200 min-h-touch
          ${currentLanguage === 'en' 
            ? 'bg-primary text-primary-foreground shadow-md' 
            : 'bg-card text-card-foreground border-2 border-border hover:border-primary'
          }
        `}
        aria-pressed={currentLanguage === 'en'}
        aria-label="Select English language"
      >
        {getTranslation(currentLanguage, 'english')}
      </button>
      <button
        onClick={() => onLanguageChange('hi')}
        className={`
          flex-1 py-4 px-6 rounded-lg text-accessible-lg font-medium
          transition-all duration-200 min-h-touch
          ${currentLanguage === 'hi' 
            ? 'bg-primary text-primary-foreground shadow-md' 
            : 'bg-card text-card-foreground border-2 border-border hover:border-primary'
          }
        `}
        aria-pressed={currentLanguage === 'hi'}
        aria-label="Select Hindi language"
      >
        {getTranslation(currentLanguage, 'hindi')}
      </button>
    </div>
  );
};
