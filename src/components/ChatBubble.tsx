import { Message } from '@/types/chat';
import { Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble = ({ message }: ChatBubbleProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div
      className={`
        chat-bubble-enter flex w-full mb-3
        ${message.isUser ? 'justify-end' : 'justify-start'}
      `}
    >
      <div
        className={`
          max-w-[85%] px-4 py-3 
          ${message.isUser 
            ? 'gradient-card text-primary-foreground rounded-2xl rounded-br-md' 
            : 'bg-card text-card-foreground rounded-2xl rounded-bl-md shadow-soft border border-border'
          }
        `}
      >
        <p className="text-accessible-base leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </p>
        
        {/* Audio playback button for AI messages with audio */}
        {!message.isUser && message.audioUrl && (
          <>
            <audio
              ref={audioRef}
              src={message.audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <button
              onClick={handlePlayAudio}
              className={`
                mt-3 flex items-center gap-2 px-3 py-2 rounded-xl
                text-sm font-medium transition-all
                ${isPlaying 
                  ? 'bg-accent/20 text-accent' 
                  : 'bg-secondary text-secondary-foreground hover:bg-accent/10'
                }
              `}
              aria-label={isPlaying ? 'Stop audio' : 'Play audio'}
            >
              {isPlaying ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {isPlaying ? 'Stop' : 'Listen'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};