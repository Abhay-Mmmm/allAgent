export const TypingIndicator = () => {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-card rounded-2xl rounded-bl-md px-5 py-4 shadow-soft border border-border">
        <div className="typing-indicator flex items-center gap-1">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};