import { Language } from '@/types/chat';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export const LanguageSelector = ({ currentLanguage, onLanguageChange }: LanguageSelectorProps) => {
  const languages: { code: Language; label: string; short: string }[] = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'hi', label: 'हिन्दी', short: 'हि' },
  ];

  return (
    <div className="flex bg-secondary rounded-xl p-1 gap-1">
      {languages.map(({ code, short }) => (
        <button
          key={code}
          onClick={() => onLanguageChange(code)}
          className={`
            px-3 py-2 rounded-lg text-sm font-semibold
            transition-all duration-200
            ${currentLanguage === code 
              ? 'bg-card text-foreground shadow-soft' 
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
          aria-label={`Switch to ${code === 'en' ? 'English' : 'Hindi'}`}
        >
          {short}
        </button>
      ))}
    </div>
  );
};