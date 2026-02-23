
import React, { useMemo } from 'react';
import { Table } from '../types';

interface CashierDashboardProps {
  tables: Table[];
  onSelectTable: (tableNo: string) => void;
  restaurantName?: string | null;
  isOnline: boolean;
  syncError: boolean;
}

const CashierDashboard: React.FC<CashierDashboardProps> = ({ 
  tables, 
  onSelectTable, 
  restaurantName,
  isOnline,
  syncError
}) => {
  const occupiedTables = useMemo(() => {
    return tables.filter(t => t.status === 'occupied' && t.master_order_id);
  }, [tables]);

  const showOffline = !isOnline || syncError;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <header className="mb-10 relative">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">
              {restaurantName || 'Cashier Desk'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${showOffline ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {showOffline ? 'Offline' : 'Live Billing'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Bills</h3>
          <span className="text-[10px] font-black text-slate-400">{occupiedTables.length} Orders</span>
        </div>

        {occupiedTables.length > 0 ? (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            {occupiedTables.map((table, index) => (
              <button
                key={`${table.table_no}-${table.master_order_id || index}`}
                onClick={() => onSelectTable(table.table_no)}
                className={`w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors ${index !== occupiedTables.length - 1 ? 'border-bottom border-slate-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg">
                    {table.master_order_id}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bill - Account #</p>
                    <p className="text-sm font-black text-slate-900">{table.order_account}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</p>
                    <p className="text-sm font-bold text-slate-900"> {table.order_type==2 ? 'TAKE AWAY / PICKUP' : 'DELIVERY'}</p>
                  </div>
                  <div className="p-2 text-slate-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active orders found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierDashboard;
