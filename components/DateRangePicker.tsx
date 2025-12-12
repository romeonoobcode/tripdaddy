import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  onClose: () => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange, onClose }) => {
  // Initialize view based on startDate or today
  const [viewDate, setViewDate] = useState(() => {
    return startDate ? new Date(startDate) : new Date();
  });

  // Get today's date string for disabling past dates
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const handleDayClick = (dayStr: string) => {
    // If no start date is selected, or both are already selected, start a new range
    if (!startDate || (startDate && endDate)) {
      onChange(dayStr, '');
    } 
    // If start date is selected but no end date
    else if (startDate && !endDate) {
      if (dayStr < startDate) {
        // If clicked date is before start date, treat it as new start date
        onChange(dayStr, '');
      } else {
        // Complete the range and close IMMEDIATELY
        onChange(startDate, dayStr);
        onClose(); 
      }
    }
  };

  const getDayClass = (dayStr: string) => {
    const base = "w-10 h-10 flex items-center justify-center text-sm font-medium transition-all rounded-full relative z-10";
    
    // Disabled (past dates)
    if (dayStr < todayStr) return `${base} text-slate-300 cursor-not-allowed`;

    // Exact matches
    if (dayStr === startDate || dayStr === endDate) {
        return `${base} bg-sky-600 text-white shadow-md shadow-sky-600/20 scale-105`;
    }

    // In range
    if (startDate && endDate && dayStr > startDate && dayStr < endDate) {
        return `${base} bg-sky-100 text-sky-700 rounded-none`; // Rectangular for flow? Or rounded-none looks weird with gaps. Let's keep rounded but different color.
    }
    // Actually, distinct circle style is cleaner for this UI than a connecting strip unless we adjust margins. 
    // Let's stick to circles but color the in-between ones.
    if (startDate && endDate && dayStr > startDate && dayStr < endDate) {
       return `${base} bg-sky-50 text-sky-700`;
    }

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
          const disabled = dayStr < todayStr;
          
          // Add connecting strip effect logic if desired, keeping simple circles for now as it's cleaner to implement robustly without heavy CSS
          return (
            <button
              key={dayStr}
              onClick={() => !disabled && handleDayClick(dayStr)}
              disabled={disabled}
              className="relative p-0 flex items-center justify-center"
            >
              {/* Range background strip logic could go here */}
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