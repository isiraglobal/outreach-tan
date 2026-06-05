import React from 'react';

export function Textarea({ className = '', style = {}, ...props }) {
  return (
    <textarea
      className={`form-textarea ${className}`}
      style={style}
      {...props}
    />
  );
}
