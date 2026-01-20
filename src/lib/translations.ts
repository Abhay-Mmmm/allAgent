import { Language } from '@/types/chat';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    appName: 'allAgent Lite',
    tagline: 'Your friendly insurance helper',
    startChat: 'Start Chat',
    selectLanguage: 'Choose Language',
    english: 'English',
    hindi: 'हिंदी',
    typeMessage: 'Type your message...',
    send: 'Send',
    listening: 'Listening...',
    tapToSpeak: 'Tap to speak',
    errorMessage: 'Sorry, something went wrong. Please try again.',
    noInfoError: "Sorry, I don't have information on that.",
    networkError: 'No internet connection. Please check and try again.',
    welcomeMessage: 'Hello! I am your insurance assistant. How can I help you today?',
    back: 'Back',
    newChat: 'New Chat',
  },
  hi: {
    appName: 'allAgent Lite',
    tagline: 'आपका मित्र बीमा सहायक',
    startChat: 'चैट शुरू करें',
    selectLanguage: 'भाषा चुनें',
    english: 'English',
    hindi: 'हिंदी',
    typeMessage: 'अपना संदेश लिखें...',
    send: 'भेजें',
    listening: 'सुन रहा हूं...',
    tapToSpeak: 'बोलने के लिए टैप करें',
    errorMessage: 'माफ़ कीजिए, कुछ गड़बड़ हो गई। कृपया पुनः प्रयास करें।',
    noInfoError: 'माफ़ कीजिए, मेरे पास इसकी जानकारी नहीं है।',
    networkError: 'इंटरनेट कनेक्शन नहीं है। कृपया जांचें और पुनः प्रयास करें।',
    welcomeMessage: 'नमस्ते! मैं आपका बीमा सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?',
    back: 'वापस',
    newChat: 'नई चैट',
  },
};

export const getTranslation = (language: Language, key: string): string => {
  return translations[language][key] || translations['en'][key] || key;
};
