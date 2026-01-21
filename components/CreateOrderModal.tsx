import React, { useState } from 'react';

interface CreateOrderModalProps {
  tableNo: string;
  onClose: () => void;
  onConfirm: (code: string, pass: string, guestNos: number) => Promise<void>;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ tableNo, onClose, onConfirm }) => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !password || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(code, password, guestCount);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncrement = () => setGuestCount(prev => prev + 1);
  const handleDecrement = () => setGuestCount(prev => Math.max(1, prev - 1));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <form onSubmit={handleSubmit} className="p-8">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-2xl mb-4 text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900">New Order</h3>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Table {tableNo}</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Guest Count</label>
              <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-100 rounded-2xl p-2">
                <button 
                  type="button"
                  onClick={handleDecrement}
                  disabled={guestCount <= 1}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-900 shadow-sm active:scale-90 transition-transform disabled:opacity-30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
                </button>
                <span className="text-xl font-black text-slate-900">{guestCount}</span>
                <button 
                  type="button"
                  onClick={handleIncrement}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-900 shadow-sm active:scale-90 transition-transform"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Waiter ID / Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter ID"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200"
                    required
                  />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Verification Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200 tracking-widest"
                    required
                  />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !code || !password}
              className={`
                py-4 rounded-2xl font-black text-white shadow-xl shadow-indigo-100 bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2
                ${(isSubmitting || !code || !password) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSubmitting ? (
                 <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
              ) : 'Open Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;