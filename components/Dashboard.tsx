import React, { useState, useMemo } from 'react';
import { Table, OrderItem } from '../types';

interface DashboardProps {
  tables: Table[];
  orders: OrderItem[];
  onSelectTable: (tableNo: string) => void;
  onInstall?: () => void;
  restaurantName?: string | null;
}

type FilterStatus = 'all' | 'occupied' | 'inactive';

const Dashboard: React.FC<DashboardProps> = ({ tables, orders, onSelectTable, onInstall, restaurantName }) => {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      const matchesFilter = filter === 'all' || table.status === filter;
      const matchesSearch = table.table_no.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [tables, filter, searchQuery]);

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const occupancyRate = tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0;
  const totalGuests = tables.reduce((sum, t) => sum + (t.guest_count || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <header className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {restaurantName || 'Main Floor'}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Order Management System</p>
          </div>
          {onInstall && (
            <button 
              onClick={onInstall}
              className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-100 animate-bounce active:scale-95"
            >
              Install Pro
            </button>
          )}
        </div>

        {/* Shift Overview Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl shadow-slate-200">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">Floor Occupancy</p>
             <div className="flex items-end justify-between">
                <span className="text-3xl font-black tracking-tighter">{occupancyRate}%</span>
                <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                   <div className="h-full bg-indigo-400" style={{ width: `${occupancyRate}%` }}></div>
                </div>
             </div>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Total Guests</p>
             <div className="flex items-end justify-between">
                <span className="text-3xl font-black tracking-tighter text-slate-900">{totalGuests}</span>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
             </div>
          </div>
        </div>

        {/* Search and Filters Container */}
        <div className="space-y-4">
           {/* Search Input */}
           <div className="relative group">
              <input 
                type="text"
                placeholder="Search table number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-12 py-4 font-bold text-slate-700 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-sm"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-lg hover:bg-slate-200">
                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
           </div>

           {/* Quick Filters */}
           <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 transition-all whitespace-nowrap active:scale-95 ${
                filter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200 font-bold'
                  : 'bg-white text-slate-500 border-slate-50 hover:border-slate-200'
              }`}
            >
              <span className="text-sm">All</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${filter === 'all' ? 'bg-white/20' : 'bg-slate-100'}`}>{tables.length}</span>
            </button>

            <button
              onClick={() => setFilter('occupied')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 transition-all whitespace-nowrap active:scale-95 ${
                filter === 'occupied'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-100 font-bold'
                  : 'bg-white text-slate-500 border-slate-50 hover:border-slate-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${filter === 'occupied' ? 'bg-white' : 'bg-orange-500'}`}></div>
              <span className="text-sm">Occupied</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${filter === 'occupied' ? 'bg-white/20' : 'bg-orange-50 text-orange-600'}`}>{occupiedCount}</span>
            </button>

            <button
              onClick={() => setFilter('inactive')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 transition-all whitespace-nowrap active:scale-95 ${
                filter === 'inactive'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-100 font-bold'
                  : 'bg-white text-slate-500 border-slate-50 hover:border-slate-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${filter === 'inactive' ? 'bg-white' : 'bg-emerald-500'}`}></div>
              <span className="text-sm">Available</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${filter === 'inactive' ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>{tables.length - occupiedCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Redesigned Grid: More columns, smaller tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
        {filteredTables.length > 0 ? (
          filteredTables.map((table) => (
            <button
              key={table.table_no}
              onClick={() => table.status === 'occupied' && onSelectTable(table.table_no)}
              disabled={table.status !== 'occupied'}
              className={`
                relative aspect-[4/5] flex flex-col items-center justify-center rounded-2xl sm:rounded-[2rem] shadow-sm transition-all duration-300 group
                ${table.status === 'occupied' 
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-200/40 active:scale-90 cursor-pointer border-b-4 border-orange-600/30' 
                  : 'bg-white text-slate-300 border border-slate-100 opacity-60 cursor-not-allowed'}
              `}
            >
              {/* Refined Label */}
              <span className={`text-[8px] sm:text-[9px] uppercase font-black tracking-[0.15em] mb-1 ${table.status === 'occupied' ? 'text-white/80' : 'text-slate-400'}`}>
                T-No
              </span>
              
              {/* Table Number */}
              <span className={`text-2xl sm:text-3xl font-black tracking-tighter ${table.status === 'occupied' ? 'text-white drop-shadow-sm' : 'text-slate-200'}`}>
                {table.table_no}
              </span>
              
              {/* Guest Count Indicator */}
              {table.guest_count > 0 && table.status === 'occupied' && (
                  <div className="absolute bottom-3 flex items-center gap-1 px-2 py-0.5 bg-black/10 rounded-full backdrop-blur-sm">
                    <span className="text-[10px] font-black">{table.guest_count}</span>
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                  </div>
              )}

              {/* Status Marker */}
              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${table.status === 'occupied' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-slate-100'}`}></div>

              {/* Bottom Subtle Label for Inactive */}
              {table.status === 'inactive' && (
                <div className="absolute bottom-3">
                   <span className="text-[7px] font-black uppercase tracking-widest text-slate-300 bg-slate-50 px-2 py-0.5 rounded-md">Empty</span>
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="col-span-full py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No tables found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;