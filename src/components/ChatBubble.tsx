import { Message } from '@/types/chat';
import { Volume2 } from 'lucide-react';
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
          max-w-[85%] px-4 py-3 rounded-2xl
          ${message.isUser 
            ? 'bg-user-bubble text-user-bubble-foreground rounded-br-md' 
            : 'bg-ai-bubble text-ai-bubble-foreground rounded-bl-md shadow-sm border border-border'
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
                mt-2 flex items-center gap-2 px-3 py-2 rounded-lg
                text-accessible-sm font-medium transition-colors
                ${isPlaying 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
                }
              `}
              aria-label={isPlaying ? 'Stop audio' : 'Play audio'}
            >
              <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
              {isPlaying ? '🔊' : '▶️'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
