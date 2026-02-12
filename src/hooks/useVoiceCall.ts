import { useState, useCallback, useRef, useEffect } from 'react';
import { Language, CallStatus, Message } from '@/types/chat';
import { getTranslation } from '@/lib/translations';
import { useVoiceInput } from './useVoiceInput';
import { getChatCompletion, SYSTEM_PROMPTS } from '@/lib/groq';

// Real AI response via AWS Bedrock (Nova Sonic Model)
const getAIResponse = async (message: string, language: Language): Promise<string> => {
    // Send voice transcript to backend endpoint which uses AWS Bedrock
    try {
        const response = await fetch('http://localhost:8000/api/voice-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_identifier: "voice-user-123", // Can be dynamic
                transcript: message,
                // phone_number: "" // Optional
            }),
        });

        if (!response.ok) {
            throw new Error(`Voice API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.text_response;
    } catch (error) {
        console.error("Error getting voice response:", error);
        return "Sorry, I am having trouble connecting to the voice service.";
    }
};

// Text-to-Speech utility
const speak = (text: string, language: Language): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            reject(new Error('Speech synthesis not supported'));
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(e);

        window.speechSynthesis.speak(utterance);
    });
};

export const useVoiceCall = (language: Language) => {
    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { isListening, isSupported, transcript, startListening, stopListening, resetTranscript } = useVoiceInput();

    // Handle voice transcript
    useEffect(() => {
        const processTranscript = async () => {
            if (transcript && callStatus === 'active' && !isMuted) {
                const userMessage: Message = {
                    id: Date.now().toString(),
                    text: transcript,
                    isUser: true,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, userMessage]);
                resetTranscript();

                // Get AI response
                try {
                    const response = await getAIResponse(transcript, language);
                    const aiMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        text: response,
                        isUser: false,
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, aiMessage]);

                    // Speak the response
                    setIsSpeaking(true);
                    await speak(response, language);
                    setIsSpeaking(false);

                    // Resume listening after speaking
                    if (callStatus === 'active' && !isMuted) {
                        startListening();
                    }
                } catch (error) {
                    console.error('Error processing voice:', error);
                    setIsSpeaking(false);
                }
            }
        };

        if (transcript) {
            stopListening();
            processTranscript();
        }
    }, [transcript, callStatus, isMuted, language, resetTranscript, startListening, stopListening]);

    // Call duration timer
    useEffect(() => {
        if (callStatus === 'active') {
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [callStatus]);

    const startCall = useCallback(async () => {
        setCallStatus('connecting');
        setMessages([]);
        setCallDuration(0);

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        setCallStatus('active');

        // Welcome message
        const welcomeText = getTranslation(language, 'welcomeMessage');
        const welcomeMessage: Message = {
            id: 'welcome',
            text: welcomeText,
            isUser: false,
            timestamp: new Date(),
        };
        setMessages([welcomeMessage]);

        // Speak welcome message
        setIsSpeaking(true);
        try {
            await speak(welcomeText, language);
        } catch (error) {
            console.error('TTS error:', error);
        }
        setIsSpeaking(false);

        // Start listening for user
        if (isSupported && !isMuted) {
            startListening();
        }
    }, [language, isSupported, isMuted, startListening]);

    const endCall = useCallback(() => {
        stopListening();
        window.speechSynthesis.cancel();
        setCallStatus('ended');
        setIsSpeaking(false);
    }, [stopListening]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newMuted = !prev;
            if (newMuted) {
                stopListening();
            } else if (callStatus === 'active' && !isSpeaking) {
                startListening();
            }
            return newMuted;
        });
    }, [callStatus, isSpeaking, startListening, stopListening]);

    const resetCall = useCallback(() => {
        setCallStatus('idle');
        setMessages([]);
        setCallDuration(0);
        setIsMuted(false);
        setIsSpeaking(false);
    }, []);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        callStatus,
        messages,
        isMuted,
        isSpeaking,
        isListening,
        isSupported,
        callDuration,
        formattedDuration: formatDuration(callDuration),
        startCall,
        endCall,
        toggleMute,
        resetCall,
    };
};
