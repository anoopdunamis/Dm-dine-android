
import React, { useState } from 'react';

interface VerificationModalProps {
  type: 'delete' | 'confirm';
  onClose: () => void;
  onConfirm: (code: string, note?: string) => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ type, onClose, onConfirm }) => {
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <h3 className="text-2xl font-black text-slate-900 mb-2">
            {type === 'delete' ? 'Delete Item' : 'Confirm Order'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            Enter your waiter identification code to proceed.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Waiter ID</label>
              <input
                type="password"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xl font-black tracking-widest focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200"
                autoFocus
              />
            </div>

            {type === 'confirm' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Special Note (Optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Allergies, urgency..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none h-24"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8">
            <button
              onClick={onClose}
              className="py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(code, note)}
              disabled={code.length < 3}
              className={`
                py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all
                ${type === 'delete' ? 'bg-rose-500 shadow-rose-100' : 'bg-indigo-600 shadow-indigo-100'}
                ${code.length < 3 ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {type === 'delete' ? 'Delete' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;
