import React from 'react';

export function Alert({ className = '', children, ...props }) {
  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border border-yellow-200/50 bg-yellow-50/50 p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-yellow-600 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ className = '', children, ...props }) {
  return (
    <div className={`text-sm text-yellow-800/90 leading-relaxed ${className}`} {...props}>
      {children}
    </div>
  );
}
