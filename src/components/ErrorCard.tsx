import { AlertCircle } from 'lucide-react';

interface ErrorCardProps {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
  /** Compact variant for inline use inside another card. */
  compact?: boolean;
}

export default function ErrorCard({ title, message, action, compact }: ErrorCardProps) {
  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-2xl border border-red-200 bg-red-50 text-red-900 ${compact ? 'p-4' : 'p-5'}`}
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-1 break-words text-sm text-red-800/90">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-3 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-red-900 shadow-sm ring-1 ring-red-200 transition hover:bg-red-100"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
