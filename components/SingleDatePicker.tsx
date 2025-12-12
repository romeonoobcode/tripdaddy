
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SingleDatePickerProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  onClose: () => void;
  minDate?: string;
  maxDate?: string;
}

export const SingleDatePicker: React.FC<SingleDatePickerProps> = ({ date, onChange, onClose, minDate, maxDate }) => {
  // Initialize view based on current date or minDate or today
  const [viewDate, setViewDate] = useState(() => {
    if (date) return new Date(date);
    if (minDate) return new Date(minDate);
    return new Date();
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(viewDate);

  const formatDate = (day: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${month}-${d}`;
  };

  const handleDayClick = (dayStr: string) => {
    onChange(dayStr);
    onClose();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const isDisabled = (dayStr: string) => {
      if (minDate && dayStr < minDate) return true;
      if (maxDate && dayStr > maxDate) return true;
      return false;
  };

  const getDayClass = (dayStr: string) => {
    const base = "w-10 h-10 flex items-center justify-center text-sm font-medium transition-all rounded-full relative z-10";
    
    if (isDisabled(dayStr)) return `${base} text-slate-300 cursor-not-allowed`;
    if (dayStr === date) return `${base} bg-sky-600 text-white shadow-md shadow-sky-600/20`;
    
    return `${base} hover:bg-slate-100 text-slate-700`;
  };

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 w-[320px] select-none animate-fade-in-up">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-slate-800">{monthName}</span>
        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs text-slate-400 font-semibold">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const dayStr = formatDate(day);
          const disabled = isDisabled(dayStr);
          return (
            <button
              key={dayStr}
              onClick={() => !disabled && handleDayClick(dayStr)}
              disabled={disabled}
              className="relative p-0 flex items-center justify-center"
            >
              <div className={getDayClass(dayStr)}>
                {day}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
