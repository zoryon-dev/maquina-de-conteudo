# Component Patterns - Máquina de Conteúdo

## Padrões de Componentes React

## Estrutura Base de Componente
```typescript
// 1. Imports (externos → internos)
import { useState } from 'react';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces
type Props = {
  title: string;
  onAction?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
};

// 3. Component
export function ComponentName({ title, onAction, variant = 'primary' }: Props) {
  // 4. Hooks
  const [state, setState] = useState(null);

  // 5. Handlers
  const handleClick = () => {
    onAction?.();
  };

  // 6. Render
  return (
    <button
      onClick={handleClick}
      className={cn(
        'base-classes',
        variant === 'primary' && 'primary-classes',
        variant === 'secondary' && 'secondary-classes'
      )}
    >
      {title}
    </button>
  );
}
```

## Padrão de Button com Variantes
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[#1f3dbc] hover:bg-[#2a4fd1] text-white',
  secondary: 'bg-white/10 hover:bg-white/20 text-white',
  ghost: 'hover:bg-white/5 text-white/70 hover:text-white',
  danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
};

type ButtonProps = {
  variant?: ButtonVariant;
  children: React.ReactNode;
  onClick?: () => void;
};

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-6 py-3 rounded-xl transition-all font-medium',
        buttonVariants[variant]
      )}
    >
      {children}
    </button>
  );
}
```

## Padrão de Modal/Dialog
```typescript
'use client';

import { createContext, useContext } from 'react';

type ModalContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function Modal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ModalContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </ModalContext.Provider>
  );
}

Modal.Trigger = function ModalTrigger({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const ctx = useContext(ModalContext);
  return (
    <button onClick={() => { ctx?.open(); onClick?.(); }}>
      {children}
    </button>
  );
};

Modal.Content = function ModalContent({ children }: { children: React.ReactNode }) {
  const ctx = useContext(ModalContext);
  if (!ctx?.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-md w-full">
        {children}
      </div>
    </div>
  );
};
```

## Padrão de Input com Label e Error
```typescript
type InputProps = {
  label: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function Input({ label, error, value, onChange, placeholder }: InputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-white/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-xl bg-[#1a1a2e] border px-4 py-3 outline-none transition-all',
          error ? 'border-red-500/50' : 'border-white/10 focus:border-[#1f3dbc]/40'
        )}
      />
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}
```

## Hook customizado para CN (clsx + tailwind-merge)
```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
