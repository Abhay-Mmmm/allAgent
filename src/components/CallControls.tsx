import { PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { Language } from '@/types/chat';
import { getTranslation } from '@/lib/translations';

interface CallControlsProps {
    isMuted: boolean;
    isSpeaking: boolean;
    onToggleMute: () => void;
    onEndCall: () => void;
    language: Language;
}

export const CallControls = ({
    isMuted,
    isSpeaking,
    onToggleMute,
    onEndCall,
    language,
}: CallControlsProps) => {
    return (
        <div className="flex items-center justify-center gap-6">
            {/* Mute Button */}
            <button
                onClick={onToggleMute}
                className={`
          w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-soft
          ${isMuted
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }
        `}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
                {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>

            {/* End Call Button */}
            <button
                onClick={onEndCall}
                className="
          w-20 h-20 rounded-full flex items-center justify-center
          bg-destructive text-destructive-foreground
          hover:bg-destructive/90 active:scale-95
          transition-all duration-300 shadow-lg
        "
                aria-label={getTranslation(language, 'endCall')}
            >
                <PhoneOff className="w-8 h-8" />
            </button>

            {/* Speaker Indicator */}
            <div
                className={`
          w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-soft
          ${isSpeaking
                        ? 'bg-accent/20 text-accent animate-pulse'
                        : 'bg-secondary text-muted-foreground'
                    }
        `}
                aria-label={isSpeaking ? 'AI Speaking' : 'AI Silent'}
            >
                <Volume2 className="w-7 h-7" />
            </div>
        </div>
    );
};
