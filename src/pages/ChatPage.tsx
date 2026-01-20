import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useChat } from '@/hooks/useChat';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ErrorMessage } from '@/components/ErrorMessage';

export const ChatPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { messages, isLoading, error, sendMessage, clearChat, initializeChat } = useChat(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);

  // Initialize chat or handle incoming scan result
  useEffect(() => {
    const state = location.state as { initialMessage?: string } | null;

    if (state?.initialMessage && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true;
      sendMessage(state.initialMessage);
      // Clear state so it doesn't resend on refresh
      window.history.replaceState({}, document.title);
    } else if (messages.length === 0 && !state?.initialMessage) {
      initializeChat();
    }
  }, [initializeChat, location.state, messages.length, sendMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleNewChat = () => {
    clearChat();
    initializeChat();
  };

  const handleBack = () => {
    navigate('/mobile');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <ChatHeader
        language={language}
        onBack={handleBack}
        onNewChat={handleNewChat}
      />

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {isLoading && <TypingIndicator />}

          {error && <ErrorMessage message={error} />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        language={language}
      />
    </div>
  );
};