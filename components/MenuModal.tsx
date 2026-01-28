
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
      className={`w-6 h-6 border-[1.5px] flex items-center justify-center shrink-0 rounded-md backdrop-blur-md bg-white/80 ${isVeg ? 'border-emerald-500 shadow-emerald-100' : 'border-rose-500 shadow-rose-100'} shadow-sm ${className}`} 
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      <div className={`w-2.5 h-2.5 rounded-sm rotate-45 ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
    </div>
  );
};

const isPromoActive = (item: MenuItem): boolean => {
  if (!item.Promotion || item.Promotion.toLowerCase() !== 'yes') return false;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  if (item.offer_start_date && todayStr < item.offer_start_date) return false;
  if (item.offer_end_date && todayStr > item.offer_end_date) return false;
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
        <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </div>
    );
  }
  const imgSrc = path.startsWith('http') ? path : IMAGE_BASE_URL + path;
  return (
    <img 
      src={imgSrc} 
      alt={item.food_name}
      className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-700 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
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
      return matchesCategory && itemName.includes(query);
    }).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [items, selectedCatId, searchQuery]);

  return (
    <div className="fixed inset-0 z-[100] flex justify-center bg-slate-950/60 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-full max-w-3xl bg-slate-50 flex flex-col h-full shadow-2xl animate-in slide-in-from-bottom-8 duration-500 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden sm:my-4 sm:h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Section - Significantly increased padding for iPhone status bar clearance */}
        <div className="bg-white border-b border-slate-100 safe-top shadow-xl shadow-slate-200/50 z-30">
          <div className="px-6 pt-20 pb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
               Menu <span className="text-indigo-600">Collection</span>
            </h2>
            <button 
              onClick={onClose} 
              className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-900 rounded-2xl hover:bg-slate-900 hover:text-white active:scale-90 transition-all focus:outline-none z-50 shadow-sm"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 pb-6">
            {/* Search with modern styling */}
            <div className="relative mb-6">
              <input 
                type="text"
                placeholder="Find something delicious..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-14 py-4 font-bold text-slate-800 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-inner"
              />
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Premium Category Navigation */}
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar scroll-smooth">
              <button
                onClick={() => setSelectedCatId('all')}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2
                  ${selectedCatId === 'all' 
                    ? 'bg-slate-950 border-slate-950 text-white shadow-lg shadow-slate-200 translate-y-[-2px]' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
              >
                All Picks
              </button>
              {sortedCategories.map(cat => (
                <button
                  key={cat.cat_id}
                  onClick={() => setSelectedCatId(cat.cat_id)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2
                    ${selectedCatId === cat.cat_id 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 translate-y-[-2px]' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >
                  {cat.category_name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar bg-slate-50">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pb-20">
              {filteredItems.map(item => {
                const activePromo = isPromoActive(item);
                const hasOfferPrice = activePromo && item.offer_price !== undefined && item.offer_price !== item.Price;
                const isFree = activePromo && parseFloat(item.offer_price || '0') === 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 border border-slate-100 active:scale-95 transition-all text-left flex flex-col group relative"
                  >
                    <div className="aspect-square bg-slate-100 relative overflow-hidden">
                      <MenuItemImage item={item} />
                      
                      {/* Floating Action Button */}
                      <div className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all transform scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 z-20 border border-white/50">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      </div>

                      {/* Top Overlay Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                        {activePromo && item.offer_title && (
                          <div className="bg-orange-500 text-white text-[8px] font-black px-2.5 py-1.5 uppercase tracking-tighter rounded-xl shadow-lg animate-pulse backdrop-blur-md">
                            {item.offer_title}
                          </div>
                        )}
                        <DietarySymbol type={item.food_type} />
                      </div>
                    </div>
                    
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <h4 className="font-black text-slate-900 text-sm leading-tight mb-3 line-clamp-2 tracking-tight group-hover:text-indigo-600 transition-colors">
                        {item.food_name}
                      </h4>
                      
                      <div className="flex items-center gap-2">
                        {isFree ? (
                          <span className="text-emerald-600 font-black text-xs uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg">FREE</span>
                        ) : (
                          <div className="flex flex-col">
                             <div className="flex items-baseline gap-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase">{item.Currency}</span>
                                <span className="text-lg font-black text-slate-900 tracking-tighter">
                                  {hasOfferPrice ? item.offer_price : item.Price}
                                </span>
                             </div>
                             {hasOfferPrice && (
                                <span className="text-slate-300 line-through text-[10px] font-black">
                                  {item.Currency} {item.Price}
                                </span>
                             )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-10 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-32 h-32 bg-slate-100 rounded-[3rem] flex items-center justify-center mb-8 shadow-inner relative">
                <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-2xl animate-pulse"></div>
                <svg className="w-12 h-12 text-slate-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">No items found</h3>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest max-w-[200px]">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>
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
