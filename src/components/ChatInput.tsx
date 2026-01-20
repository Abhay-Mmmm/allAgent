import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Language } from '@/types/chat';
import { getTranslation } from '@/lib/translations';
import { VoiceButton } from './VoiceButton';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  language: Language;
}

export const ChatInput = ({ onSend, isLoading, language }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { isListening, isSupported, transcript, startListening, stopListening, resetTranscript } = useVoiceInput();

  // Update input when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSend(inputValue.trim());
      setInputValue('');
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-card border-t border-border">
      {/* Voice input button */}
      <VoiceButton
        isListening={isListening}
        isSupported={isSupported}
        onToggle={handleVoiceToggle}
        language={language}
      />

      {/* Text input */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isListening 
            ? getTranslation(language, 'listening') 
            : getTranslation(language, 'typeMessage')
          }
          disabled={isLoading}
          className={`
            w-full px-4 py-3 rounded-full
            bg-secondary text-secondary-foreground
            placeholder:text-muted-foreground
            text-accessible-base
            border-2 border-transparent
            focus:outline-none focus:border-primary
            disabled:opacity-50
            transition-all duration-200
            ${isListening ? 'bg-listening/10 border-listening' : ''}
          `}
          aria-label={getTranslation(language, 'typeMessage')}
        />
        
        {/* Listening indicator inside input */}
        {isListening && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 listening-dots flex gap-1">
            <span className="w-2 h-2 rounded-full bg-listening"></span>
            <span className="w-2 h-2 rounded-full bg-listening"></span>
            <span className="w-2 h-2 rounded-full bg-listening"></span>
          </div>
        )}
      </div>

      {/* Send button */}
      <button
        type="submit"
        disabled={!inputValue.trim() || isLoading}
        className={`
          flex items-center justify-center
          w-14 h-14 rounded-full
          bg-primary text-primary-foreground
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:bg-primary/90 active:scale-95
          transition-all duration-200
          shadow-md
        `}
        aria-label={getTranslation(language, 'send')}
      >
        <Send className="w-6 h-6" />
      </button>
    </form>
  );
};
