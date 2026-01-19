import React, { useState } from 'react';
import { OrderItem } from '../types';

interface EditItemModalProps {
  item: OrderItem;
  onClose: () => void;
  onConfirm: (quantity: number, preferences: string) => void;
  isLoading: boolean;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onConfirm, isLoading }) => {
  const [quantity, setQuantity] = useState(item.food_quantity);
  // Reconstruct preferences string for editing (assuming @ separation)
  const [prefs, setPrefs] = useState(item.preferences.map(p => p.name).join('@'));

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => Math.max(1, prev - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <h3 className="text-2xl font-black text-slate-900 mb-2">Edit Item</h3>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-tight mb-6">
            {item.food_name}
          </p>

          <div className="space-y-6">
            {/* Quantity Selector */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Quantity</label>
              <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-100 rounded-3xl p-2">
                <button 
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-900 shadow-sm active:scale-90 transition-transform disabled:opacity-30"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
                </button>
                <span className="text-2xl font-black text-slate-900">{quantity}</span>
                <button 
                  onClick={handleIncrement}
                  className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-900 shadow-sm active:scale-90 transition-transform"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>

            {/* Preferences Input */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Preferences (Use @ to separate)</label>
              <textarea
                value={prefs}
                onChange={(e) => setPrefs(e.target.value)}
                placeholder="e.g. Extra Spicy @ No Onions"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none h-28 placeholder:text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(quantity, prefs)}
              disabled={isLoading}
              className={`
                py-4 rounded-2xl font-black text-white shadow-xl shadow-indigo-100 bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2
                ${isLoading ? 'opacity-50' : ''}
              `}
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;