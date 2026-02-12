import { useState, useCallback } from 'react';
import { Message, Language, ChatApiResponse } from '@/types/chat';
import { getTranslation } from '@/lib/translations';

import { getChatCompletion, SYSTEM_PROMPTS } from '@/lib/groq';

// Real Groq API call
const sendChatMessage = async (message: string, language: Language, history: Message[] = []): Promise<ChatApiResponse> => {
  // Format history for API
  const apiMessages = history.map(msg => ({
    role: msg.isUser ? "user" : "assistant",
    content: msg.text
  } as const));

  // Add current message
  // apiMessages.push({ role: "user", content: message }); // Already handled in function

  // We are calling the new backend via getChatCompletion
  // The backend expects just the messages array for now in our simple implementation
  // Actually, getChatCompletion implementation above sends just the latest message
  // Let's rely on that for this iteration or update getChatCompletion to handle history later.

  // Add current message to the list so getChatCompletion can read the last one
  apiMessages.push({ role: "user", content: message });

  const responseText = await getChatCompletion(apiMessages, "");

  return {
    reply_text: responseText,
    reply_audio_url: null,
  };
};

export const useChat = (language: Language) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((text: string, isUser: boolean, audioUrl?: string) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      isUser,
      timestamp: new Date(),
      audioUrl,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setError(null);
    addMessage(text, true);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(text, language, messages);
      addMessage(response.reply_text, false, response.reply_audio_url || undefined);
    } catch (err) {
      const errorKey = !navigator.onLine ? 'networkError' : 'errorMessage';
      setError(getTranslation(language, errorKey));
    } finally {
      setIsLoading(false);
    }
  }, [language, addMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const initializeChat = useCallback(() => {
    if (messages.length === 0) {
      addMessage(getTranslation(language, 'welcomeMessage'), false);
    }
  }, [language, messages.length, addMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    initializeChat,
  };
};
