import { useState } from 'react';
import { Language } from '@/types/chat';
import { LandingPage } from './LandingPage';
import { ChatPage } from './ChatPage';

type Screen = 'landing' | 'chat';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [language, setLanguage] = useState<Language>('en');

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  const handleStartChat = () => {
    setCurrentScreen('chat');
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
  };

  if (currentScreen === 'chat') {
    return (
      <ChatPage 
        language={language}
        onBack={handleBackToLanding}
      />
    );
  }

  return (
    <LandingPage
      language={language}
      onLanguageChange={handleLanguageChange}
      onStartChat={handleStartChat}
    />
  );
};

export default Index;
