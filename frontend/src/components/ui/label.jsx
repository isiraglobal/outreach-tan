import React from 'react';

export function Label({ className = '', htmlFor, children, style = {}, ...props }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`form-label ${className}`}
      style={style}
      {...props}
    >
      {children}
    </label>
  );
}
