import React from 'react';

export function Badge({ className = '', variant = 'default', children, ...props }) {
  const variantClass = {
    default: 'badge-default',
    secondary: 'badge-secondary',
    outline: 'badge-outline',
    destructive: 'badge-danger',
    success: 'badge-success',
    warning: 'badge-warning',
    info: 'badge-info'
  }[variant] || 'badge-default';

  return (
    <span className={`badge ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
}
