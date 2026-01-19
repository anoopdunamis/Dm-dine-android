import React, { useState, useEffect, useMemo } from 'react';
import { OrderItem, ItemPreference } from '../types';

interface EditItemModalProps {
  item: OrderItem;
  onClose: () => void;
  onConfirm: (quantity: number, preferences: string) => void;
  onFetchPreferences: (foodId: string) => Promise<ItemPreference[]>;
  isLoading: boolean;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onConfirm, onFetchPreferences, isLoading }) => {
  const [quantity, setQuantity] = useState(item.food_quantity);
  const [availablePrefs, setAvailablePrefs] = useState<ItemPreference[]>([]);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [isFetchingPrefs, setIsFetchingPrefs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Use a ref to track if initial mapping has been done
  const initialMappingDone = React.useRef(false);

  useEffect(() => {
    let isMounted = true;
    const loadPrefs = async () => {
      setIsFetchingPrefs(true);
      try {
        const prefs = await onFetchPreferences(item.food_id);
        if (!isMounted) return;
        
        setAvailablePrefs(prefs);
        
        // Match existing item preferences with available ones ONLY ONCE
        if (!initialMappingDone.current) {
          const currentPrefNames = item.preferences.map(p => p.name.trim().toLowerCase());
          const initialSelected = prefs
            .filter(p => currentPrefNames.includes(p.name.trim().toLowerCase()))
            .map(p => p.name);
          
          setSelectedPrefs(initialSelected);
          initialMappingDone.current = true;
        }
      } finally {
        if (isMounted) setIsFetchingPrefs(false);
      }
    };
    loadPrefs();
    return () => { isMounted = false; };
  }, [item.food_id, onFetchPreferences]); // Removed item.preferences to avoid sync loops

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => Math.max(1, prev - 1));

  const togglePreference = (prefName: string) => {
    setSelectedPrefs(prev => 
      prev.includes(prefName) 
        ? prev.filter(p => p !== prefName) 
        : [...prev, prefName]
    );
  };

  const handleClearAll = () => setSelectedPrefs([]);

  const filteredPrefs = useMemo(() => {
    return availablePrefs.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availablePrefs, searchQuery]);

  const handleUpdate = () => {
    const preferencesString = selectedPrefs.join('@');
    onConfirm(quantity, preferencesString);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-8 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Edit Item</h3>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-tight">
                {item.food_name}
              </p>
            </div>
            {selectedPrefs.length > 0 && (
              <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-indigo-200 animate-in zoom-in">
                {selectedPrefs.length} SELECTED
              </div>
            )}
          </div>

          <div className="flex-grow overflow-y-auto space-y-8 pr-2 custom-scrollbar mt-6">
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

            {/* Preferences Multi-Select */}
            <div className="space-y-4">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Food Preferences</label>
                {selectedPrefs.length > 0 && (
                  <button 
                    onClick={handleClearAll}
                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Filter preferences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-10 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <div className="flex flex-wrap gap-2 min-h-[120px]">
                {isFetchingPrefs ? (
                  <div className="w-full py-12 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Options</span>
                  </div>
                ) : filteredPrefs.length > 0 ? (
                  filteredPrefs.map((pref) => {
                    const isSelected = selectedPrefs.includes(pref.name);
                    return (
                      <button
                        key={pref.id}
                        onClick={() => togglePreference(pref.name)}
                        className={`
                          px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all duration-200 flex items-center gap-2
                          ${isSelected 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 border-indigo-600' 
                            : 'bg-white text-slate-500 border-2 border-slate-100 hover:border-slate-200'}
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {pref.name}
                      </button>
                    );
                  })
                ) : (
                  <div className="w-full py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      {searchQuery ? 'No matching options' : 'No options available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8 shrink-0">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isLoading || isFetchingPrefs}
              className={`
                py-4 rounded-2xl font-black text-white shadow-xl shadow-indigo-100 bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2
                ${(isLoading || isFetchingPrefs) ? 'opacity-50' : ''}
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
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default EditItemModal;