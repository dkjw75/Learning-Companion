import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

type ButtonUiVariant = 'primary' | 'outline' | 'quiet' | 'choice';
type ButtonUiSize = 'default' | 'small';

type ButtonUiProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonUiVariant;
  size?: ButtonUiSize;
};

export function ButtonUi({ variant = 'primary', size = 'default', className = '', children, ...props }: ButtonUiProps) {
  return <button className={`button-ui button-ui-${variant} button-ui-${size} ${className}`} {...props}>
    <span className="button-ui-content">{children ?? 'Click Me'}</span>
  </button>;
}

type ButtonUiLinkProps = Omit<LinkProps, 'className'> & {
  variant?: Exclude<ButtonUiVariant, 'choice'>;
  size?: ButtonUiSize;
  className?: string;
  children: ReactNode;
};

export function ButtonUiLink({ variant = 'primary', size = 'default', className = '', children, ...props }: ButtonUiLinkProps) {
  return <Link className={`button-ui button-ui-${variant} button-ui-${size} ${className}`} {...props}>
    <span className="button-ui-content">{children}</span>
  </Link>;
}

export default ButtonUi;
