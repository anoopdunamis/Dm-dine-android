import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, ItemPreference } from '../types';

interface AddItemSelectionModalProps {
  item: MenuItem;
  onClose: () => void;
  onConfirm: (quantity: number, preferences: string, code: string) => Promise<void>;
  onFetchPreferences: (foodId: string) => Promise<ItemPreference[]>;
  isLoading: boolean;
}

const IMAGE_BASE_URL = 'https://dynafiles.s3.us-east-2.amazonaws.com/dmfp/';

const DietarySymbol = ({ type, className = "" }: { type: 'Veg' | 'Non', className?: string }) => {
  const isVeg = type === 'Veg';
  return (
    <div 
      className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 ${isVeg ? 'border-emerald-600' : 'border-rose-800'} ${className}`} 
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-800'}`} />
    </div>
  );
};

const AddItemSelectionModal: React.FC<AddItemSelectionModalProps> = ({ item, onClose, onConfirm, onFetchPreferences, isLoading }) => {
  const [quantity, setQuantity] = useState(1);
  const [availablePrefs, setAvailablePrefs] = useState<ItemPreference[]>([]);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [isFetchingPrefs, setIsFetchingPrefs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImgLoaded, setIsImgLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadPrefs = async () => {
      setIsFetchingPrefs(true);
      try {
        const prefs = await onFetchPreferences(item.id);
        if (isMounted) setAvailablePrefs(prefs || []);
      } finally {
        if (isMounted) setIsFetchingPrefs(false);
      }
    };
    loadPrefs();
    return () => { isMounted = false; };
  }, [item.id, onFetchPreferences]);

  const togglePreference = (prefName: string) => {
    const name = String(prefName || '').trim();
    if (!name) return;
    const lowerName = name.toLowerCase();
    setSelectedPrefs(prev => {
      const exists = prev.some(p => String(p || '').toLowerCase().trim() === lowerName);
      if (exists) {
        return prev.filter(p => String(p || '').toLowerCase().trim() !== lowerName);
      } else {
        return [...prev, name];
      }
    });
  };

  const filteredPrefs = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    return availablePrefs.filter(p => 
      String(p.name || '').toLowerCase().includes(query)
    );
  }, [availablePrefs, searchQuery]);

  const handleConfirm = () => {
    const preferencesString = selectedPrefs.filter(Boolean).join('@');
    // Passing empty string for code as verification is removed from this modal
    onConfirm(quantity, preferencesString, '');
  };

  const imgSrc = useMemo(() => {
    const filename = (item.Image_Thumb || item.Image_Large || '').trim();
    if (!filename) return null;
    return filename.startsWith('http') ? filename : IMAGE_BASE_URL + filename;
  }, [item.Image_Thumb, item.Image_Large]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-8 flex flex-col h-full overflow-hidden">
          <div className="mb-6 flex gap-4 items-start">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shrink-0 shadow-inner">
               {imgSrc ? (
                 <img 
                   src={imgSrc} 
                   alt="" 
                   className={`w-full h-full object-cover transition-opacity duration-500 ${isImgLoaded ? 'opacity-100' : 'opacity-0'}`} 
                   onLoad={() => setIsImgLoaded(true)}
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-300">NO IMG</div>
               )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <DietarySymbol type={item.food_type} />
                <h3 className="text-2xl font-black text-slate-900 leading-tight truncate">Add to Order</h3>
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-tight truncate">{item.food_name || 'Item'}</p>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto space-y-8 pr-1 custom-scrollbar">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Quantity</label>
              <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-100 rounded-3xl p-2">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-900 shadow-sm active:scale-90 transition-transform"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
                </button>
                <span className="text-2xl font-black text-slate-900">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-900 shadow-sm active:scale-90 transition-transform"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferences</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Filter preferences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-10 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {isFetchingPrefs ? (
                  <div className="w-full py-10 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase">Loading...</span>
                  </div>
                ) : filteredPrefs.length > 0 ? (
                  filteredPrefs.map(pref => {
                    const prefName = String(pref.name || '');
                    const isSelected = selectedPrefs.some(p => String(p || '').toLowerCase().trim() === prefName.toLowerCase().trim());
                    return (
                      <button
                        key={pref.id}
                        onClick={() => togglePreference(prefName)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2
                          ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        {prefName}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[10px] font-bold text-slate-300 uppercase py-4">No preferences found</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8 pt-4 border-t border-slate-50 shrink-0">
            <button onClick={onClose} className="py-4 rounded-2xl font-bold text-slate-500 active:scale-95">Back</button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`py-4 rounded-2xl font-black text-white shadow-xl bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-50' : ''}`}
            >
              {isLoading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AddItemSelectionModal;