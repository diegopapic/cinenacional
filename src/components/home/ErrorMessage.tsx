// src/components/home/ErrorMessage.tsx
interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="mb-8 p-4 bg-red-900/20 border border-red-500 rounded-lg">
      <p className="text-red-300">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-2 text-sm underline hover:no-underline text-red-300"
        >
          Reintentar
        </button>
      ) : (
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm underline hover:no-underline text-red-300"
        >
          Recargar página
        </button>
      )}
    </div>
  );
}