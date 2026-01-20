import { useState, useCallback, useRef, useEffect } from 'react';
import { transcribeAudio } from '@/lib/groq';

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useVoiceInput = (): UseVoiceInputReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // VAD Parameters
  const SILENCE_THRESHOLD = 0.02; // Adjust based on microphone sensitivity
  const SILENCE_DURATION = 1500; // 1.5 seconds of silence to stop
  const MIN_RECORDING_DURATION = 500; // Minimum 0.5s to consider valid speech

  const isSupported = typeof window !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < 1000) return; // Ignore empty/tiny recordings

    try {
      const text = await transcribeAudio(audioBlob);
      if (text && text.trim().length > 0) {
        setTranscript(text);
      }
    } catch (error) {
      console.error("Transcription failed:", error);
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Audio Context for VAD
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);

        // Cleanup streams
        stream.getTracks().forEach(track => track.stop());
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setTranscript('');

      // VAD Logic Loop
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let speechStarted = false;
      let startTime = Date.now();

      const checkVolume = () => {
        if (!analyserRef.current || mediaRecorder.state === 'inactive') return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedVolume = average / 255;

        if (normalizedVolume > SILENCE_THRESHOLD) {
          // Speech detected
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          speechStarted = true;
        } else if (speechStarted && (Date.now() - startTime > MIN_RECORDING_DURATION)) {
          // Silence detected after speech
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              stopRecording();
            }, SILENCE_DURATION);
          }
        }

        requestAnimationFrame(checkVolume);
      };

      checkVolume();

    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsListening(false);
    }
  }, [isSupported, stopRecording, processAudio]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening: stopRecording,
    resetTranscript,
  };
};
