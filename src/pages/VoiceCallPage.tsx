import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowLeft, Shield } from 'lucide-react';
import { getTranslation } from '@/lib/translations';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { useLanguage } from '@/context/LanguageContext';
import { CallControls } from '@/components/CallControls';
import { WaveformAnimation } from '@/components/WaveformAnimation';

export const VoiceCallPage = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();

    const {
        callStatus,
        messages,
        isMuted,
        isSpeaking,
        isListening,
        isSupported,
        formattedDuration,
        startCall,
        endCall,
        toggleMute,
        resetCall,
    } = useVoiceCall(language);

    // Auto-start call when page loads
    useEffect(() => {
        if (callStatus === 'idle') {
            startCall();
        }
    }, [callStatus, startCall]);

    const handleBack = () => {
        if (callStatus === 'active' || callStatus === 'connecting') {
            endCall();
        }
        resetCall();
        navigate('/mobile');
    };

    const getStatusText = () => {
        switch (callStatus) {
            case 'connecting':
                return 'Connecting...';
            case 'active':
                return isSpeaking
                    ? 'AI Speaking...'
                    : isListening
                        ? 'Listening...'
                        : formattedDuration;
            case 'ended':
                return 'Call Ended';
            default:
                return '';
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/30">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-sm">
                <button
                    onClick={handleBack}
                    className="p-2 rounded-xl hover:bg-secondary transition-colors"
                    aria-label="Go back"
                >
                    <ArrowLeft className="w-6 h-6 text-foreground" />
                </button>

                <span className="text-accessible-lg font-semibold text-foreground">
                    Voice Call
                </span>

                <div className="w-10" /> {/* Spacer for header balance */}
            </header>

            {/* Main Call UI */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                {/* Avatar / Logo */}
                <div className={`
          w-32 h-32 rounded-full 
          bg-gradient-to-br from-primary to-accent
          flex items-center justify-center
          shadow-lg mb-6
          ${callStatus === 'connecting' ? 'animate-pulse' : ''}
          ${callStatus === 'active' && isSpeaking ? 'ring-4 ring-accent/50 ring-offset-4 ring-offset-background' : ''}
        `}>
                    <Shield className="w-16 h-16 text-white" />
                </div>

                {/* App Name */}
                <h1 className="text-2xl font-bold text-foreground mb-2">
                    {getTranslation(language, 'appName')}
                </h1>

                {/* Status */}
                <p className={`
          text-lg mb-8
          ${callStatus === 'active'
                        ? isSpeaking ? 'text-accent' : isListening ? 'text-primary' : 'text-muted-foreground'
                        : 'text-muted-foreground'
                    }
        `}>
                    {getStatusText()}
                </p>

                {/* Waveform Animation */}
                <div className="mb-12">
                    <WaveformAnimation
                        isActive={callStatus === 'active'}
                        isSpeaking={isSpeaking}
                    />
                </div>

                {/* Voice Support Warning */}
                {!isSupported && callStatus === 'active' && (
                    <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-xl mb-6 text-sm">
                        Voice input not supported in this browser
                    </div>
                )}

                {/* Last Message */}
                {messages.length > 0 && (
                    <div className="w-full max-w-sm bg-card rounded-2xl p-4 shadow-soft mb-8">
                        <p className="text-sm text-muted-foreground mb-1">
                            {messages[messages.length - 1].isUser
                                ? 'You said:'
                                : 'AI said:'
                            }
                        </p>
                        <p className="text-foreground">
                            {messages[messages.length - 1].text}
                        </p>
                    </div>
                )}

                {/* Call Controls */}
                {(callStatus === 'active' || callStatus === 'connecting') && (
                    <CallControls
                        isMuted={isMuted}
                        isSpeaking={isSpeaking}
                        onToggleMute={toggleMute}
                        onEndCall={endCall}
                        language={language}
                    />
                )}

                {/* Ended State - Restart Button */}
                {callStatus === 'ended' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-muted-foreground text-center">
                            Call duration: ${formattedDuration}
                        </p>
                        <button
                            onClick={() => {
                                resetCall();
                                startCall();
                            }}
                            className="
                flex items-center gap-2 px-6 py-3 
                bg-primary text-primary-foreground 
                rounded-2xl font-semibold
                hover:opacity-90 active:scale-95
                transition-all shadow-soft
              "
                        >
                            <Phone className="w-5 h-5" />
                            Call Again
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Safety Note */}
            <footer className="px-6 pb-6 text-center">
                <p className="text-sm text-muted-foreground">
                    🔒 Your voice is only used to ask questions
                </p>
            </footer>
        </div>
    );
};
