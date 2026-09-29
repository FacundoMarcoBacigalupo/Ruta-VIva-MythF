export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin ${className}`}
    />
  );
}
