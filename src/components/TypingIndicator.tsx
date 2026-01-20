export const TypingIndicator = () => {
  return (
    <div className="flex justify-start mb-3 chat-bubble-enter">
      <div className="bg-ai-bubble border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="typing-indicator flex items-center gap-1 h-6">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};
