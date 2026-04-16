import React, { useId } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'evidence' | 'control' | 'skeuomorphic';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  helperText,
  icon,
  variant = 'default',
  className,
  id,
  ...props
}) => {
  const resolvedHint = hint || helperText;
  const autoId = useId();
  const inputId = id || autoId;

  const variants = {
    default:  'bg-white/[0.02] border border-white/[0.06] rounded-xl text-white placeholder-white/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-300 shadow-inner focus:bg-white/[0.04]',
    evidence: 'bg-white/[0.02] border border-white/[0.06] border-l-4 border-l-primary rounded-r-xl transition-all duration-300',
    control:  'bg-white/[0.02] border border-white/[0.06] rounded-xl font-mono text-sm transition-all duration-300',
    skeuomorphic: 'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-primary/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/30 transition-all duration-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] hover:bg-white/[0.04]',
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-secondary">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={clsx(
            'input-authority w-full outline-none px-4 py-3',
            variants[variant],
            error && 'border-status-critical focus:border-status-critical focus:ring-status-critical/20',
            icon && 'pl-10',
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
      </div>

      {error && <p className="text-xs text-status-critical font-medium">{error}</p>}
      {resolvedHint && !error && <p className="text-xs text-ink-tertiary">{resolvedHint}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: 'default' | 'evidence' | 'control' | 'skeuomorphic';
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  variant = 'default',
  className,
  id,
  ...props
}) => {
  const autoId = useId();
  const textareaId = id || autoId;

  const variants = {
    default:  'bg-white/[0.02] border border-white/[0.06] rounded-xl text-white placeholder-white/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-300 shadow-inner focus:bg-white/[0.04]',
    evidence: 'bg-white/[0.02] border border-white/[0.06] border-l-4 border-l-primary rounded-r-xl transition-all duration-300',
    control:  'bg-white/[0.02] border border-white/[0.06] rounded-xl font-mono text-sm transition-all duration-300',
    skeuomorphic: 'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-primary/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/30 transition-all duration-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] hover:bg-white/[0.04]',
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-ink-secondary">
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        className={clsx(
          'input-authority w-full resize-vertical min-h-[100px] outline-none px-4 py-3',
          variants[variant],
          error && 'border-status-critical focus:border-status-critical focus:ring-status-critical/20',
          className
        )}
        aria-invalid={!!error}
        {...props}
      />

      {error && <p className="text-xs text-status-critical font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-tertiary">{hint}</p>}
    </div>
  );
};

// Synced for GitHub timestamp

 
