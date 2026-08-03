import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';

const fieldBase =
  'w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 dark:border-border-dark dark:bg-card-dark dark:text-foreground-dark dark:placeholder:text-muted-foreground-dark transition-colors duration-200';

export function Field({ label, error, children, hint }: { label: string; error?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{label}</span>
        {children}
      </label>
      {hint && !error ? <span className="block text-xs text-muted-foreground dark:text-muted-foreground-dark">{hint}</span> : null}
      {error ? (
        <span role="alert" className="block text-xs font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className = '', invalid, ...rest }, ref) => (
    <input ref={ref} className={`${fieldBase} ${invalid ? 'border-destructive focus:ring-destructive/30' : ''} ${className}`} {...rest} />
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...rest }, ref) => <textarea ref={ref} className={`${fieldBase} min-h-24 resize-y ${className}`} {...rest} />
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', ...rest }, ref) => <select ref={ref} className={`${fieldBase} cursor-pointer ${className}`} {...rest} />
);
Select.displayName = 'Select';
