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
    <form onSubmit={handleSubmit} className="sticky bottom-0 flex items-center gap-3 p-4 bg-card border-t border-border">
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
            w-full px-4 py-3 rounded-2xl
            bg-secondary text-secondary-foreground
            placeholder:text-muted-foreground
            text-accessible-base
            border-2 border-transparent
            focus:outline-none focus:border-primary/30
            disabled:opacity-50
            transition-all duration-200
            ${isListening ? 'bg-accent/10 border-accent/50' : ''}
          `}
          aria-label={getTranslation(language, 'typeMessage')}
        />
        
        {/* Listening indicator inside input */}
        {isListening && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 listening-dots flex gap-1">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span className="w-2 h-2 rounded-full bg-accent"></span>
          </div>
        )}
      </div>

      {/* Send button */}
      <button
        type="submit"
        disabled={!inputValue.trim() || isLoading}
        className={`
          flex items-center justify-center
          w-12 h-12 rounded-2xl
          gradient-card text-primary-foreground
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:opacity-90 active:scale-95
          transition-all duration-200
          shadow-soft
        `}
        aria-label={getTranslation(language, 'send')}
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
};