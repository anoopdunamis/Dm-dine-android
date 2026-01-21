import React, { useState, useMemo } from 'react';
import { Table, OrderItem } from '../types';
import CreateOrderModal from './CreateOrderModal';

interface DashboardProps {
  tables: Table[];
  orders: OrderItem[];
  onSelectTable: (tableNo: string) => void;
  onCreateOrder: (tableNo: string, code: string, pass: string, guestNos: number) => Promise<boolean>;
  onInstall?: () => void;
  restaurantName?: string | null;
  isOnline: boolean;
  syncError: boolean;
}

type FilterStatus = 'all' | 'occupied' | 'inactive';

const Dashboard: React.FC<DashboardProps> = ({ 
  tables, 
  orders, 
  onSelectTable, 
  onCreateOrder,
  onInstall, 
  restaurantName,
  isOnline,
  syncError
}) => {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableForNewOrder, setSelectedTableForNewOrder] = useState<string | null>(null);

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

  const showOffline = !isOnline || syncError;

  const handleTableClick = (table: Table) => {
    if (table.status === 'occupied') {
      onSelectTable(table.table_no);
    } else {
      setSelectedTableForNewOrder(table.table_no);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <header className="mb-10 relative">
        {/* Decorative Background Elements */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="flex justify-between items-center mb-10 relative z-10">
          <div className="flex gap-5 items-center">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-none">
                  {restaurantName || 'Main Floor'}
                </h1>
                <div className={`inline-flex items-center gap-1.5 bg-white shadow-sm px-3 py-1 rounded-full border self-start sm:self-auto transition-colors duration-500 ${showOffline ? 'border-rose-100' : 'border-slate-100'}`}>
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] ${showOffline ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${showOffline ? 'text-rose-500' : 'text-slate-600'}`}>
                    {showOffline ? 'Offline' : 'Live Sync'}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 ml-1"> Dashboard</p>
            </div>
          </div>
        </div>

        {/* Dynamic Shift Insight Cards */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {/* Creative Component: Floor Load */}
          <div className="bg-slate-950 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-slate-200/50 relative overflow-hidden flex flex-col justify-between aspect-square sm:aspect-auto">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             
             <div>
                <div className="flex items-center justify-between mb-4 opacity-50 relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest">Floor Load</p>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2z" strokeWidth="2.5"/></svg>
                </div>
                
                <div className="flex items-center gap-5 relative z-10">
                   <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                         <circle
                           cx="50" cy="50" r={radius}
                           stroke="currentColor" strokeWidth="10"
                           fill="transparent" className="text-white/5"
                         />
                         <circle
                           cx="50" cy="50" r={radius}
                           stroke="currentColor" strokeWidth="10"
                           fill="transparent"
                           strokeDasharray={circumference}
                           style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                           strokeLinecap="round"
                           className="text-indigo-500 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                         />
                      </svg>
                      <span className="absolute text-sm font-black tracking-tighter">{occupancyRate}%</span>
                   </div>
                   <div className="hidden sm:block">
                      <span className="text-4xl font-black tracking-tighter block">{occupiedCount}</span>
                      <p className="text-[10px] font-black uppercase tracking-tight opacity-40">Active Tables</p>
                   </div>
                </div>
             </div>

             <div className="mt-6 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                   <span className="text-[10px] font-black text-emerald-400 uppercase">{tables.length - occupiedCount} Available</span>
                </div>
             </div>
          </div>

          {/* Creative Component: Service Pulse */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-emerald-200/50 relative overflow-hidden group flex flex-col justify-between aspect-square sm:aspect-auto">
             <div className="absolute inset-0 opacity-20 pointer-events-none">
                <svg className="w-full h-full animate-[drift_20s_linear_infinite]" viewBox="0 0 100 100" preserveAspectRatio="none">
                   <path d="M0,50 C20,20 40,80 60,50 C80,20 100,80 100,50 L100,100 L0,100 Z" fill="white" />
                </svg>
             </div>

             <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Service Pulse</p>
                   <div className={`flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border ${showOffline ? 'bg-rose-500/20 border-rose-100/20' : 'bg-white/20 border-white/20'}`}>
                      <div className={`w-2 h-2 rounded-full ${showOffline ? 'bg-rose-300' : 'bg-white animate-ping'}`}></div>
                      <span className="text-[9px] font-black uppercase">{showOffline ? 'Halted' : 'Active'}</span>
                   </div>
                </div>
                
                <div className="flex items-baseline gap-2">
                   <span className="text-5xl font-black tracking-tighter leading-none">{totalGuests}</span>
                   <span className="text-xs font-black uppercase opacity-60 tracking-widest">Guests</span>
                </div>
                <div className="mt-3 flex items-center gap-2 opacity-90">
                  <div className="w-1 h-4 bg-white/30 rounded-full"></div>
                  <p className="text-[11px] font-bold uppercase tracking-tight">
                     {activeOrdersCount} Open Orders
                  </p>
                </div>
             </div>

             <div className="flex justify-end relative z-10 mt-2">
                <div className="bg-black/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform duration-500">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                </div>
             </div>
          </div>
        </div>

        {/* Refined Search and Filters */}
        <div className="space-y-5">
           <div className="relative group">
              <input 
                type="text"
                placeholder="Find a table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-[1.5rem] px-14 py-5 font-bold text-slate-800 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-sm text-lg"
              />
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
           </div>

           <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar scroll-smooth">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl border-2 transition-all whitespace-nowrap active:scale-95 ${
                filter === 'all'
                  ? 'bg-slate-950 text-white border-slate-950 shadow-2xl shadow-slate-200 font-bold'
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
              }`}
            >
              <span className="text-sm">Overview</span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${filter === 'all' ? 'bg-white/10' : 'bg-slate-100 text-slate-400'}`}>{tables.length}</span>
            </button>

            <button
              onClick={() => setFilter('occupied')}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl border-2 transition-all whitespace-nowrap active:scale-95 ${
                filter === 'occupied'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-2xl shadow-orange-100 font-bold'
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${filter === 'occupied' ? 'bg-white' : 'bg-orange-500 animate-pulse'}`}></div>
              <span className="text-sm">Occupied</span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${filter === 'occupied' ? 'bg-white/20' : 'bg-orange-50 text-orange-600'}`}>{occupiedCount}</span>
            </button>

            <button
              onClick={() => setFilter('inactive')}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl border-2 transition-all whitespace-nowrap active:scale-95 ${
                filter === 'inactive'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xl shadow-emerald-100 font-bold'
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${filter === 'inactive' ? 'bg-white' : 'bg-emerald-500'}`}></div>
              <span className="text-sm">Available</span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${filter === 'inactive' ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>{tables.length - occupiedCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Grid: Modern Interactive Tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {filteredTables.length > 0 ? (
          filteredTables.map((table) => (
            <button
              key={table.table_no}
              onClick={() => handleTableClick(table)}
              className={`
                relative aspect-[4/5] flex flex-col items-center justify-center rounded-[2rem] shadow-sm transition-all duration-500 group overflow-hidden
                ${table.status === 'occupied' 
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-100 active:scale-95 cursor-pointer border-b-4 border-orange-600/30' 
                  : 'bg-white text-slate-300 border-2 border-slate-100 hover:border-indigo-200 active:scale-95 cursor-pointer'}
              `}
            >
              {/* Internal Glow for Occupied */}
              {table.status === 'occupied' && (
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              )}

              <span className={`text-[9px] uppercase font-black tracking-[0.2em] mb-2 ${table.status === 'occupied' ? 'text-white/70' : 'text-slate-400'}`}>
                Table
              </span>
              
              <span className={`text-3xl font-black tracking-tighter ${table.status === 'occupied' ? 'text-white drop-shadow-md' : 'text-slate-400'}`}>
                {table.table_no}
              </span>
              
              {table.status === 'occupied' ? (
                  <div className="absolute bottom-4 flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full backdrop-blur-md border border-white/20 shadow-lg">
                    <span className="text-[11px] font-black">{table.guest_count || 0}</span>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  </div>
              ) : (
                <div className="absolute bottom-4 flex flex-col items-center gap-1">
                   <div className="p-1.5 bg-indigo-50 rounded-full group-hover:bg-indigo-600 transition-colors">
                      <svg className="w-4 h-4 text-indigo-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                   </div>
                </div>
              )}

              <div className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${table.status === 'occupied' ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,1)]' : 'bg-slate-100'}`}></div>
            </button>
          ))
        ) : (
          <div className="col-span-full py-24 text-center animate-in fade-in zoom-in duration-700">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-100 rounded-[2.5rem] mb-8 shadow-inner">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No tables match your filter</p>
          </div>
        )}
      </div>

      {selectedTableForNewOrder && (
        <CreateOrderModal 
          tableNo={selectedTableForNewOrder}
          onClose={() => setSelectedTableForNewOrder(null)}
          onConfirm={async (code, pass, guests) => {
            const success = await onCreateOrder(selectedTableForNewOrder, code, pass, guests);
            if (success) setSelectedTableForNewOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;