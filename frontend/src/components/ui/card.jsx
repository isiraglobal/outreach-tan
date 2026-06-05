import React from 'react';

export function Card({ className = '', children, style = {}, ...props }) {
  return (
    <div
      className={`card ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, style = {}, ...props }) {
  return (
    <div
      className={className}
      style={{ padding: '20px 22px 0', ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, style = {}, ...props }) {
  return (
    <h3
      className={className}
      style={{
        margin: 0,
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.01em',
        ...style
      }}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, style = {}, ...props }) {
  return (
    <p
      className={className}
      style={{
        margin: '4px 0 0',
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        ...style
      }}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, style = {}, ...props }) {
  return (
    <div
      className={className}
      style={{ padding: '16px 22px 22px', ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
