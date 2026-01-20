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
  if (!isSupported) {
    return (
      <button
        disabled
        className="flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
        aria-label="Voice input not supported"
        title="Voice input not supported in this browser"
      >
        <MicOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        flex items-center justify-center
        w-12 h-12 rounded-2xl
        transition-all duration-200
        ${isListening 
          ? 'bg-accent text-accent-foreground recording-pulse shadow-soft' 
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }
      `}
      aria-label={isListening 
        ? getTranslation(language, 'stopRecording') 
        : getTranslation(language, 'startRecording')
      }
    >
      <Mic className="w-5 h-5" />
    </button>
  );
};