import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="flex justify-center mb-3">
      <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-2xl">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-accessible-sm font-medium">{message}</p>
      </div>
    </div>
  );
};