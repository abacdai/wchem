import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover dark:bg-secondary dark:text-background-dark dark:hover:bg-primary',
  accent: 'bg-accent text-white hover:bg-accent-hover',
  outline: 'border border-border bg-transparent hover:bg-muted dark:border-border-dark dark:hover:bg-muted-dark',
  ghost: 'bg-transparent hover:bg-muted dark:hover:bg-muted-dark',
  destructive: 'bg-destructive text-white hover:opacity-90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    />
  )
);
Button.displayName = 'Button';
