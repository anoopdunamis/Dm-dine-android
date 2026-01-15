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
  const activeOrdersCount = orders.length;

  // Calculation for the radial gauge
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (occupancyRate / 100) * circumference;

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
          {/* CREATIVE REDESIGN: Floor Load Gauge Card */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-xl shadow-slate-200/50 relative overflow-hidden flex flex-col justify-between h-full">
             <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
             
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 relative z-10">Floor Load</p>
                <div className="flex items-center gap-4 relative z-10">
                   {/* Radial Progress Ring */}
                   <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                         {/* Background Circle */}
                         <circle
                           cx="50" cy="50" r={radius}
                           stroke="currentColor" strokeWidth="8"
                           fill="transparent" className="text-white/5"
                         />
                         {/* Progress Circle */}
                         <circle
                           cx="50" cy="50" r={radius}
                           stroke="currentColor" strokeWidth="8"
                           fill="transparent"
                           strokeDasharray={circumference}
                           style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-out' }}
                           strokeLinecap="round"
                           className="text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]"
                         />
                      </svg>
                      <span className="absolute text-[11px] font-black">{occupancyRate}%</span>
                   </div>
                   <div>
                      <span className="text-3xl font-black tracking-tighter block leading-none">{occupiedCount}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Tables In Use</span>
                   </div>
                </div>
             </div>

             <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   <span className="text-[9px] font-bold opacity-60 uppercase">{tables.length - occupiedCount} Free</span>
                </div>
                <svg className="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth="3" /></svg>
             </div>
          </div>

          {/* Service Pulse Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group flex flex-col justify-between h-full">
             <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg className="w-full h-full animate-[drift_20s_linear_infinite]" viewBox="0 0 100 100" preserveAspectRatio="none">
                   <path d="M0,50 C20,20 40,80 60,50 C80,20 100,80 100,50 L100,100 L0,100 Z" fill="white" />
                </svg>
             </div>

             <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Service Pulse</p>
                   <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                      <span className="text-[8px] font-black">LIVE</span>
                   </div>
                </div>
                
                <div className="flex items-baseline gap-1">
                   <span className="text-3xl font-black tracking-tighter">{totalGuests}</span>
                   <span className="text-[10px] font-black uppercase opacity-60">Guests</span>
                </div>
                <p className="text-[9px] font-bold opacity-80 uppercase tracking-tight mt-1">
                   {activeOrdersCount} ACTIVE ORDERS
                </p>
             </div>

             <div className="flex justify-end relative z-10 mt-2">
                <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
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

      {/* Grid: Smaller, modern tiles */}
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
              <span className={`text-[8px] sm:text-[9px] uppercase font-black tracking-[0.15em] mb-1 ${table.status === 'occupied' ? 'text-white/80' : 'text-slate-400'}`}>
                T-No
              </span>
              
              <span className={`text-2xl sm:text-3xl font-black tracking-tighter ${table.status === 'occupied' ? 'text-white drop-shadow-sm' : 'text-slate-200'}`}>
                {table.table_no}
              </span>
              
              {table.guest_count > 0 && table.status === 'occupied' && (
                  <div className="absolute bottom-3 flex items-center gap-1 px-2 py-0.5 bg-black/10 rounded-full backdrop-blur-sm">
                    <span className="text-[10px] font-black">{table.guest_count}</span>
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                  </div>
              )}

              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${table.status === 'occupied' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-slate-100'}`}></div>

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