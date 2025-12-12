
import React, { useState } from 'react';
import { X, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from './Button';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (instruction: string) => void;
  activityName: string;
}

export const RegenerateModal: React.FC<RegenerateModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  activityName 
}) => {
  const [instruction, setInstruction] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Replace Activity</h3>
            <p className="text-sm text-slate-500">Replacing: <span className="font-medium text-slate-700">{activityName}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 mb-4">
          <div className="flex gap-2">
            <Sparkles size={18} className="text-sky-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-sky-800">
              Tell me what you'd prefer instead! You can ask for a specific place ("Visit the Louvre") or a different vibe ("Something more chill").
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-slate-700">Your Preference (Optional)</label>
            <textarea 
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none resize-none h-24 text-sm"
                placeholder="e.g. I'm too tired for hiking, give me a relaxing cafe instead..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                autoFocus
            />
        </div>

        <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} fullWidth>
                Cancel
            </Button>
            <Button 
                variant="primary" 
                onClick={() => onConfirm(instruction)} 
                fullWidth
            >
                Regenerate
            </Button>
        </div>

      </div>
    </div>
  );
};
