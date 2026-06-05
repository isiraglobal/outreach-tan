import React, { useEffect } from 'react';

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget && onOpenChange) onOpenChange(false); }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ className = '', children, style = {}, ...props }) {
  return (
    <div className={`dialog-panel ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ className = '', children, ...props }) {
  return (
    <div style={{ marginBottom: 20 }} className={className} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ className = '', children, ...props }) {
  return (
    <h3
      style={{
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.02em'
      }}
      className={className}
      {...props}
    >
      {children}
    </h3>
  );
}

export function DialogFooter({ className = '', children, ...props }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 24,
        paddingTop: 20,
        borderTop: '1px solid var(--color-border)'
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
