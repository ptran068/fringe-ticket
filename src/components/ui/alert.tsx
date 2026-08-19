interface AlertProps {
  children: React.ReactNode;
  className?: string;
}

export function Alert({ children, className = '' }: AlertProps) {
  return (
    <div
      className={`rounded-xl border border-coral/20 bg-coral/10 px-3.5 py-3 text-sm text-coral animate-fade-in ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
}
