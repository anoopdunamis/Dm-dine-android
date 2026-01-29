
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
      className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 rounded-sm ${isVeg ? 'border-emerald-600' : 'border-rose-800'} ${className}`} 
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
  const [waiterCode, setWaiterCode] = useState('');

  // Primary identifier resolution - prefer id for menu items as it's the database PK
  const primaryId = useMemo(() => {
    return item.id || (item as any).food_id || (item as any).Item_Id;
  }, [item]);

  useEffect(() => {
    let isMounted = true;
    const loadPrefs = async () => {
      if (!primaryId) return;
      setIsFetchingPrefs(true);
      try {
        const prefs = await onFetchPreferences(primaryId);
        if (isMounted) setAvailablePrefs(prefs || []);
      } finally {
        if (isMounted) setIsFetchingPrefs(false);
      }
    };
    loadPrefs();
    return () => { isMounted = false; };
  }, [primaryId, onFetchPreferences]);

  // Log whenever available preferences change
  useEffect(() => {
    console.log(`[AddItemSelectionModal] availablePrefs changed. Count: ${availablePrefs.length}`, availablePrefs);
  }, [availablePrefs]);

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
    if (!waiterCode) return;
    onConfirm(quantity, preferencesString, waiterCode);
  };

  const imgSrc = useMemo(() => {
    const filename = (item.Image_Thumb || item.Image_Large || '').trim();
    if (!filename) return null;
    return filename.startsWith('http') ? filename : IMAGE_BASE_URL + filename;
  }, [item.Image_Thumb, item.Image_Large]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
        <div className="p-8 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="mb-6 flex gap-4 items-start shrink-0">
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
                <h3 className="text-xl font-black text-slate-900 leading-tight truncate">Add Item</h3>
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-tight truncate">{item.food_name || 'Item'}</p>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-grow overflow-y-auto space-y-8 pr-1 custom-scrollbar">
            {/* Quantity */}
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

            {/* Preferences Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center ml-1">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferences</label>
                 {selectedPrefs.length > 0 && (
                   <span className="text-[9px] font-black text-indigo-500 uppercase">{selectedPrefs.length} selected</span>
                 )}
              </div>
              
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Filter preferences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-10 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[100px]">
                {isFetchingPrefs ? (
                  <div className="w-full py-10 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase">Loading options...</span>
                  </div>
                ) : filteredPrefs.length > 0 ? (
                  filteredPrefs.map(pref => {
                    const prefName = String(pref.name || '');
                    const isSelected = selectedPrefs.some(p => String(p || '').toLowerCase().trim() === prefName.toLowerCase().trim());
                    return (
                      <button
                        key={pref.id}
                        type="button"
                        onClick={() => togglePreference(prefName)}
                        className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border-2 active:scale-95
                          ${isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                      >
                        {prefName}
                      </button>
                    );
                  })
                ) : (
                  <div className="w-full py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                    <p className="text-[10px] font-bold text-slate-300 uppercase">No preferences available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Waiter Verification */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Waiter ID</label>
              <input
                type="password"
                inputMode="numeric"
                value={waiterCode}
                onChange={(e) => setWaiterCode(e.target.value)}
                placeholder="Enter ID to verify"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-black tracking-widest focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200 placeholder:tracking-normal"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mt-8 pt-4 border-t border-slate-50 shrink-0">
            <button 
              onClick={onClose} 
              disabled={isLoading}
              className="py-4 rounded-2xl font-bold text-slate-500 active:scale-95 transition-all hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || !waiterCode}
              className={`py-4 rounded-2xl font-black text-white shadow-xl shadow-indigo-100 bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2 ${isLoading || !waiterCode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Confirm Add'}
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
