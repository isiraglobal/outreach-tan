import React from 'react';

export function Button({
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
  children,
  ...props
}) {
  const variantClass = {
    default: 'btn-primary',
    outline: 'btn-outline',
    secondary: 'btn-ghost',
    destructive: 'btn-danger',
    ghost: 'btn-ghost',
    link: 'btn-ghost'
  }[variant] || 'btn-primary';

  const sizeClass = {
    default: '',
    sm: 'btn-sm',
    lg: 'btn-lg',
    icon: 'btn-icon'
  }[size] || '';

  return (
    <button
      disabled={disabled}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
