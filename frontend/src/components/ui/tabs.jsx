import React, { createContext, useContext } from 'react';

const TabsContext = createContext(null);

export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }) {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-[#E8E2DC] p-1 text-[#6B5E57] border border-[#C9B37B]/10 ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = '' }) {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      onClick={() => onValueChange && onValueChange(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
        isActive 
          ? 'bg-[#F8F5F2] text-[#3A2E27] shadow-sm font-semibold' 
          : 'hover:text-[#3A2E27]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '' }) {
  const { value: activeValue } = useContext(TabsContext);
  if (activeValue !== value) return null;

  return (
    <div className={`focus-visible:outline-none ${className}`}>
      {children}
    </div>
  );
}
