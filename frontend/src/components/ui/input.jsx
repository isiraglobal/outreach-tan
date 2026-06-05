import React from 'react';

export function Input({ className = '', style = {}, ...props }) {
  return (
    <input
      className={`form-input ${className}`}
      style={style}
      {...props}
    />
  );
}
