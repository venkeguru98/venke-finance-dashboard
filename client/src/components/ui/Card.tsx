import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div 
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
      className={`border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div 
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      className={`px-6 py-5 border-b flex justify-between items-center ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 style={{ color: 'var(--text-primary)' }} className={`text-lg font-bold tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
