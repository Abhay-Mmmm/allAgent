import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage = ({ message, onRetry }: ErrorMessageProps) => {
  return (
    <div className="flex items-start gap-3 p-4 mx-4 mb-3 rounded-lg bg-destructive/10 border border-destructive/20">
      <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-accessible-base text-destructive">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-2 text-accessible-sm text-destructive hover:underline"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
};
