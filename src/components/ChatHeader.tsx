import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Language } from '@/types/chat';
import { getTranslation } from '@/lib/translations';

interface ChatHeaderProps {
  language: Language;
  onBack: () => void;
  onNewChat: () => void;
}

export const ChatHeader = ({ language, onBack, onNewChat }: ChatHeaderProps) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shadow-md">
      <button
        onClick={onBack}
        className="flex items-center gap-2 p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label={getTranslation(language, 'back')}
      >
        <ArrowLeft className="w-6 h-6" />
        <span className="text-accessible-base font-medium sr-only sm:not-sr-only">
          {getTranslation(language, 'back')}
        </span>
      </button>

      <h1 className="text-accessible-lg font-semibold">
        {getTranslation(language, 'appName')}
      </h1>

      <button
        onClick={onNewChat}
        className="flex items-center gap-2 p-2 -mr-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label={getTranslation(language, 'newChat')}
      >
        <RotateCcw className="w-5 h-5" />
      </button>
    </header>
  );
};
