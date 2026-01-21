import React, { useState, useMemo } from 'react';
import { Category, MenuItem } from '../types';

interface MenuModalProps {
  categories: Category[];
  items: MenuItem[];
  onClose: () => void;
  onSelectItem: (item: MenuItem) => void;
}

const IMAGE_BASE_URL = 'https://dynafiles.s3.us-east-2.amazonaws.com/dmfp/AlHalabi169/menu/';

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
          <button onClick={onClose} className="p-2 -ml-2 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 active:scale-95 transition-all text-left flex flex-col group"
              >
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  <img 
                    src={IMAGE_BASE_URL + (item.Image_Thumb || item.Image_Large)} 
                    alt={item.food_name || 'Menu Item'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Item';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${item.food_type === 'Veg' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {item.food_type}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <h4 className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2">{item.food_name}</h4>
                  <p className="text-indigo-600 font-black text-sm">{item.Price} <span className="text-[10px] opacity-70">{item.Currency}</span></p>
                </div>
              </button>
            ))}
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