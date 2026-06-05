import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SelectContext = createContext(null);

export function Select({ value, onValueChange, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div ref={containerRef} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = '', children, ...props }) {
  const { isOpen, setIsOpen } = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-[#C9B37B]/30 bg-[#F8F5F2] px-3 py-2 text-sm text-[#3A2E27] focus:outline-none focus:ring-1 focus:ring-[#9BA77D] disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
      {...props}
    >
      {children}
      <span className="ml-2 text-xs text-[#6B5E57]">▼</span>
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const { value } = useContext(SelectContext);
  return <span className="text-[#3A2E27]">{value || placeholder}</span>;
}

export function SelectContent({ className = '', children }) {
  const { isOpen } = useContext(SelectContext);
  if (!isOpen) return null;

  return (
    <div className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-[#C9B37B]/30 bg-[#F8F5F2] text-[#3A2E27] shadow-lg w-full mt-1 max-h-60 overflow-y-auto animate-in fade-in-80 duration-100 ${className}`}>
      <div className="p-1">{children}</div>
    </div>
  );
}

export function SelectItem({ value, children, className = '' }) {
  const { value: selectedValue, onValueChange, setIsOpen } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange(value);
        setIsOpen(false);
      }}
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-[#3A2E27] outline-none hover:bg-[#E8E2DC]/80 focus:bg-[#E8E2DC] w-full text-left transition-colors ${
        isSelected ? 'font-semibold bg-[#E8E2DC]/50' : ''
      } ${className}`}
    >
      {isSelected && (
        <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center text-[#9BA77D]">
          ✓
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}
