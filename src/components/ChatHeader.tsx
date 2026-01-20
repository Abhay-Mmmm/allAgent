import { ArrowLeft, MoreVertical, RotateCcw } from 'lucide-react';
import { Language } from '@/types/chat';
import { getTranslation } from '@/lib/translations';
import { useState } from 'react';

interface ChatHeaderProps {
  language: Language;
  onBack: () => void;
  onNewChat: () => void;
}

export const ChatHeader = ({ language, onBack, onNewChat }: ChatHeaderProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="relative flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <button
        onClick={onBack}
        className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-secondary transition-colors"
        aria-label={getTranslation(language, 'back')}
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>

      <h1 className="text-accessible-lg font-semibold text-foreground">
        {getTranslation(language, 'appName')}
      </h1>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-secondary transition-colors"
          aria-label="Menu"
        >
          <MoreVertical className="w-5 h-5 text-foreground" />
        </button>

        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-12 z-20 bg-card rounded-xl shadow-soft-lg border border-border py-1 min-w-[160px]">
              <button
                onClick={() => {
                  onNewChat();
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary transition-colors text-left"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {getTranslation(language, 'newChat')}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};