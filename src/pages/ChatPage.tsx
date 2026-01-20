import { useEffect, useRef } from 'react';
import { Language } from '@/types/chat';
import { useChat } from '@/hooks/useChat';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ErrorMessage } from '@/components/ErrorMessage';

interface ChatPageProps {
  language: Language;
  onBack: () => void;
}

export const ChatPage = ({ language, onBack }: ChatPageProps) => {
  const { messages, isLoading, error, sendMessage, clearChat, initializeChat } = useChat(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with welcome message
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleNewChat = () => {
    clearChat();
    initializeChat();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <ChatHeader 
        language={language}
        onBack={onBack}
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