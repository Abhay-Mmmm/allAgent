export type Language = 'en' | 'hi';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatApiRequest {
  message: string;
  language: Language;
}

export interface ChatApiResponse {
  reply_text: string;
  reply_audio_url: string | null;
}

export type AppMode = 'web' | 'mobile';
export type CallStatus = 'idle' | 'connecting' | 'active' | 'ended';
