interface WaveformAnimationProps {
    isActive: boolean;
    isSpeaking: boolean;
}

export const WaveformAnimation = ({ isActive, isSpeaking }: WaveformAnimationProps) => {
    const bars = 5;

    return (
        <div className="flex items-center justify-center gap-1 h-24">
            {Array.from({ length: bars }).map((_, i) => (
                <div
                    key={i}
                    className={`
            w-3 rounded-full transition-all duration-300
            ${isActive
                            ? isSpeaking
                                ? 'bg-accent animate-waveform-speaking'
                                : 'bg-primary animate-waveform'
                            : 'bg-muted-foreground/30 h-4'
                        }
          `}
                    style={{
                        animationDelay: `${i * 0.15}s`,
                        height: isActive ? undefined : '1rem',
                    }}
                />
            ))}
        </div>
    );
};
