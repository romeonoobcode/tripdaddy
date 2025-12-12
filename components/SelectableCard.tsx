
import React from 'react';

interface SelectableCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  subLabel?: string;
  multiSelect?: boolean;
  className?: string;
}

export const SelectableCard: React.FC<SelectableCardProps> = ({ 
  selected, 
  onClick, 
  icon, 
  label, 
  subLabel,
  multiSelect,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 text-center h-full w-full
        ${selected 
          ? 'bg-sky-50 border-2 border-sky-500 shadow-md shadow-sky-500/10' 
          : 'bg-white border-2 border-transparent shadow-sm hover:bg-slate-50 hover:shadow-md'
        }
        ${className}
      `}
    >
      {selected && !multiSelect && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-500"></div>
      )}
      
      {icon && (
        <div className={`mb-2 ${selected ? 'text-sky-600' : 'text-slate-400'}`}>
          {icon}
        </div>
      )}
      
      <span className={`font-medium ${selected ? 'text-sky-900' : 'text-slate-700'}`}>
        {label}
      </span>
      
      {subLabel && (
        <span className="text-xs text-slate-400 mt-1">
          {subLabel}
        </span>
      )}
    </button>
  );
};
