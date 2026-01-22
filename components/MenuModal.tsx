import React, { useState, useMemo } from 'react';
import { Category, MenuItem } from '../types';

interface MenuModalProps {
  categories: Category[];
  items: MenuItem[];
  onClose: () => void;
  onSelectItem: (item: MenuItem) => void;
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

// Check if a promotion is active based on dates and weekdays
const isPromoActive = (item: MenuItem): boolean => {
  if (!item.Promotion || item.Promotion.toLowerCase() !== 'yes') return false;
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Date validation
  if (item.offer_start_date && todayStr < item.offer_start_date) return false;
  if (item.offer_end_date && todayStr > item.offer_end_date) return false;
  
  // Weekday validation
  if (item.offer_available_weekdays) {
    const days = item.offer_available_weekdays.split(',').map(d => d.trim().toLowerCase());
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (!days.includes(currentDay)) return false;
  }
  
  return true;
};

const MenuItemImage = ({ item }: { item: MenuItem }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  const path = (item.Image_Thumb || item.Image_Large || '').trim();
  if (!path) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-300 uppercase font-black text-[10px] bg-slate-50">
        No Photo
      </div>
    );
  }

  const imgSrc = path.startsWith('http') ? path : IMAGE_BASE_URL + path;

  return (
    <img 
      src={imgSrc} 
      alt={item.food_name || 'Menu Item'}
      className={`w-full h-full object-cover group-hover:scale-110 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
    />
  );
};

const MenuModal: React.FC<MenuModalProps> = ({ categories, items, onClose, onSelectItem }) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [categories]);

  const filteredItems = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    return items.filter(item => {
      const matchesCategory = selectedCatId === 'all' || item.CategoryID === selectedCatId;
      const itemName = (item.food_name || '').toLowerCase();
      const matchesSearch = itemName.includes(query);
      return matchesCategory && matchesSearch;
    }).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [items, selectedCatId, searchQuery]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 safe-top shadow-sm z-20">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-full shadow-lg active:scale-90 transition-all focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Select Item</h2>
          <div className="w-10"></div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input 
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-12 py-3.5 font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Categories Pills */}
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2
              ${selectedCatId === 'all' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
          >
            All Items
          </button>
          {sortedCategories.map(cat => (
            <button
              key={cat.cat_id}
              onClick={() => setSelectedCatId(cat.cat_id)}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2
                ${selectedCatId === cat.cat_id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const activePromo = isPromoActive(item);
              const hasOfferPrice = activePromo && item.offer_price !== undefined && item.offer_price !== item.Price;
              const isFree = activePromo && parseFloat(item.offer_price || '0') === 0;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 active:scale-95 transition-all text-left flex flex-col group relative"
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    <MenuItemImage item={item} />
                    
                    {/* Offer Title Banner */}
                    {activePromo && item.offer_title && (
                      <div className="absolute top-0 left-0 bg-orange-500 text-white text-[8px] font-black px-2 py-1 uppercase tracking-tighter rounded-br-xl shadow-lg z-10">
                        {item.offer_title}
                      </div>
                    )}

                    <div className="absolute top-2 right-2 p-1 bg-white/60 backdrop-blur-sm rounded-md shadow-sm z-10">
                      <DietarySymbol type={item.food_type} />
                    </div>
                  </div>
                  
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <h4 className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2">{item.food_name}</h4>
                    
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {isFree ? (
                        <p className="text-emerald-600 font-black text-sm uppercase tracking-widest">FREE</p>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <p className="text-indigo-600 font-black text-sm">
                              <span className="text-[10px] mr-0.5 opacity-70">{item.Currency}</span>
                              {hasOfferPrice ? item.offer_price : item.Price}
                            </p>
                            {hasOfferPrice && (
                              <p className="text-slate-400 line-through text-[10px] font-bold">
                                <span className="mr-0.5">{item.Currency}</span>
                                {item.Price}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-xs font-black uppercase tracking-widest">No Items Found</p>
          </div>
        )}
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default MenuModal;