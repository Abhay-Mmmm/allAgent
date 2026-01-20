import { Mic, MicOff } from 'lucide-react';
import { Language } from '@/types/chat';
import { getTranslation } from '@/lib/translations';

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  language: Language;
}

export const VoiceButton = ({ isListening, isSupported, onToggle, language }: VoiceButtonProps) => {
  if (!isSupported) return null;

  return (
    <button
      onClick={onToggle}
      className={`
        relative flex items-center justify-center
        w-14 h-14 rounded-full transition-all duration-200
        ${isListening 
          ? 'bg-recording text-white recording-pulse shadow-lg shadow-recording/30' 
          : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'
        }
      `}
      aria-label={isListening 
        ? getTranslation(language, 'listening') 
        : getTranslation(language, 'tapToSpeak')
      }
      aria-pressed={isListening}
    >
      {isListening ? (
        <MicOff className="w-6 h-6" />
      ) : (
        <Mic className="w-6 h-6" />
      )}
      
      {/* Listening indicator ring */}
      {isListening && (
        <span className="absolute inset-0 rounded-full border-4 border-recording/50 animate-ping" />
      )}
    </button>
  );
};
