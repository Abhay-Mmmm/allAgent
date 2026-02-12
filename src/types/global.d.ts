
// Web Speech API Types
interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (event: any) => void;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: (event: any) => void;
}
