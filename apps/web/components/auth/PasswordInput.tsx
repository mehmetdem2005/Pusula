'use client';

import { useState, type ReactElement } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}

/** Şifre input'u + göster/gizle toggle. */
export function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  required,
  minLength,
  className = '',
}: Props): ReactElement {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} pr-12`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-fg-faint hover:text-fg absolute inset-y-0 right-0 px-3 text-xs font-medium"
        aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
        tabIndex={-1}
      >
        {show ? 'Gizle' : 'Göster'}
      </button>
    </div>
  );
}
