import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * FieldError - Reusable Inline Field-Level Error Display for Admin Portal
 */
export const FieldError = ({ error, className = '', action = null }) => {
  if (!error) return null;

  const message = typeof error === 'object' && error !== null
    ? (error.message || error.detail || error.error || JSON.stringify(error))
    : String(error);

  if (!message || message.trim() === '') return null;

  return (
    <div
      role="alert"
      className={`mt-1.5 flex items-start gap-1.5 text-rose-600 text-[11px] font-bold animate-fade-in ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
      <div className="leading-tight">
        <span>{message}</span>
        {action && <span className="ml-1.5 inline-block">{action}</span>}
      </div>
    </div>
  );
};

export default FieldError;
