import { useState, useCallback } from 'react';
import { Message, Language, ChatApiResponse } from '@/types/chat';
import { getTranslation } from '@/lib/translations';

// Simulated API call - replace with real endpoint in production
const sendChatMessage = async (message: string, language: Language): Promise<ChatApiResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  // Simulated responses for demo
  const responses: Record<Language, string[]> = {
    en: [
      "I can help you with crop insurance information. What would you like to know?",
      "The Pradhan Mantri Fasal Bima Yojana covers losses due to natural calamities, pests, and diseases.",
      "To enroll, you'll need your Aadhaar card, land records, and bank details. Visit your nearest bank or CSC.",
      "Premium rates vary by crop. For rice, it's typically 2% of the sum insured.",
      "Claims are usually settled within 2 months of crop cutting experiments.",
    ],
    hi: [
      "मैं आपको फसल बीमा की जानकारी में मदद कर सकता हूं। आप क्या जानना चाहेंगे?",
      "प्रधानमंत्री फसल बीमा योजना प्राकृतिक आपदाओं, कीटों और बीमारियों से होने वाले नुकसान को कवर करती है।",
      "नामांकन के लिए आपको आधार कार्ड, भूमि रिकॉर्ड और बैंक विवरण की आवश्यकता होगी।",
      "प्रीमियम दरें फसल के अनुसार अलग-अलग होती हैं। चावल के लिए यह बीमित राशि का 2% है।",
      "दावों का निपटान आमतौर पर फसल कटाई प्रयोगों के 2 महीने के भीतर होता है।",
    ],
  };
  
  const langResponses = responses[language];
  const randomResponse = langResponses[Math.floor(Math.random() * langResponses.length)];
  
  return {
    reply_text: randomResponse,
    reply_audio_url: null, // Would be a real audio URL in production
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
      const response = await sendChatMessage(text, language);
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
