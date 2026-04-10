import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'critical' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  const base = 'btn-ripple relative inline-flex items-center justify-center font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent rounded-xl active:scale-[0.98] overflow-hidden group';

  const variants = {
    primary:   'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 shadow-[0_4px_30px_rgba(76,130,251,0.2)] focus:ring-primary/40 before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity',
    secondary: 'bg-white/[0.03] border border-white/[0.05] text-ink-primary hover:border-white/[0.1] hover:bg-white/[0.06] shadow-sm focus:ring-primary/20',
    critical:  'bg-status-critical/10 hover:bg-status-critical/20 text-status-critical border border-status-critical/20 hover:border-status-critical/40 focus:ring-status-critical/30',
    success:   'bg-status-success/10 hover:bg-status-success/20 text-status-success border border-status-success/20 hover:border-status-success/40 focus:ring-status-success/30',
    ghost:     'bg-transparent border border-transparent text-ink-secondary hover:text-ink-primary hover:bg-white/[0.05] focus:ring-primary/20'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  return (
    <button
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

// Synced for GitHub timestamp
