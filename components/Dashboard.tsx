import React, { useState } from 'react';
import { Table, OrderItem, OrderStatus } from '../types';

interface DashboardProps {
  tables: Table[];
  orders: OrderItem[];
  onSelectTable: (tableNo: string) => void;
  onInstall?: () => void;
}

type FilterStatus = 'all' | 'occupied' | 'inactive';

const Dashboard: React.FC<DashboardProps> = ({ tables, orders, onSelectTable, onInstall }) => {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filteredTables = tables.filter(table => {
    if (filter === 'all') return true;
    return table.status === filter;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Restaurant View</h1>
          <p className="text-slate-500 mt-1">Select a table to manage orders</p>
        </div>
        {onInstall && (
          <button 
            onClick={onInstall}
            className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-indigo-100 animate-bounce"
          >
            Install App
          </button>
        )}
      </header>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-sm border transition-all ${
            filter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 font-bold scale-105'
              : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300 font-medium'
          }`}
        >
          <span className="text-sm">All Tables</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${filter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {tables.length}
          </span>
        </button>

        <button
          onClick={() => setFilter('occupied')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-sm border transition-all ${
            filter === 'occupied'
              ? 'bg-orange-500 text-white border-orange-500 font-bold scale-105'
              : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300 font-medium'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${filter === 'occupied' ? 'bg-white' : 'bg-orange-500'}`}></div>
          <span className="text-sm">Occupied</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${filter === 'occupied' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}>
            {tables.filter(t => t.status === 'occupied').length}
          </span>
        </button>

        <button
          onClick={() => setFilter('inactive')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-sm border transition-all ${
            filter === 'inactive'
              ? 'bg-emerald-600 text-white border-emerald-600 font-bold scale-105'
              : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300 font-medium'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${filter === 'inactive' ? 'bg-white' : 'bg-emerald-500'}`}></div>
          <span className="text-sm">Inactive</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${filter === 'inactive' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
            {tables.filter(t => t.status === 'inactive').length}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {filteredTables.length > 0 ? (
          filteredTables.map((table) => (
            <button
              key={table.table_no}
              onClick={() => onSelectTable(table.table_no)}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-2xl shadow-sm transition-all active:scale-95
                ${table.status === 'occupied' 
                  ? 'bg-orange-500 text-white ring-4 ring-orange-100' 
                  : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-300'}
              `}
            >
              <span className="text-[10px] uppercase font-bold opacity-80 mb-1">Table</span>
              <span className="text-2xl font-black tracking-tighter">{table.table_no}</span>
              {table.guest_count > 0 && (
                  <span className="mt-2 text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded-full">
                      {table.guest_count} Guests
                  </span>
              )}
            </button>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-slate-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No tables detected from API</p>
            <p className="text-slate-300 text-[10px] mt-1">Please wait or try to sign in again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;