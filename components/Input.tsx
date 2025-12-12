import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1">{label}</label>}
      <input
        className={`
          w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 
          placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 
          outline-none transition-all duration-200 shadow-sm
          ${className}
        `}
        {...props}
      />
    </div>
  );
};