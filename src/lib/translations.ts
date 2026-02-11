import { Language } from '@/types/chat';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    appName: 'allAgent',
    tagline: 'Your AI Insurance Assistant',
    startChat: 'Start Chat',
    selectLanguage: 'Choose Language',
    english: 'English',
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
    endCall: 'End Call',
    voiceCall: 'Voice Call',
    vsYesterday: 'vs yesterday',
    thisWeek: 'this week',
    // Dashboard
    dashboard: 'Dashboard',
    claims: 'Claims',
    settings: 'Settings',
    switchToMobile: 'Mobile App',
    overview: 'DASHBOARD OVERVIEW',
    totalCalls: 'TOTAL CALLS TODAY',
    activeUsers: 'ACTIVE USERS',
    newEnrollments: 'NEW ENROLLMENTS',
    claimsOpen: 'CLAIMS OPEN',
    successRate: 'SUCCESS RATE',
    liveCallQueue: 'Live Call Queue (VAPI Integration)',
    userManagement: 'User Management & KYC',
    alerts: 'Alerts & Exceptions',
    aiRecommendations: 'AI Product Recommendations',
    // Claims Page
    claimsManagement: 'Claims Management',
    searchClaims: 'Search by ID or Name...',
    filter: 'Filter',
    // Settings Page
    profileSettings: 'Profile Settings',
    preferences: 'Preferences',
    security: 'Security',
    language: 'Language',
    changePassword: 'Change Password',
    notificationSettings: 'Notification Settings',
    fullName: 'Full Name',
    role: 'Role',
    superAdmin: 'Super Admin',
    stopRecording: 'Stop Recording',
    startRecording: 'Start Recording',
  },
};

export const getTranslation = (language: Language, key: string): string => {
  return translations[language][key] || translations['en'][key] || key;
};
