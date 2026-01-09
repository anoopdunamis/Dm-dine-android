
import React, { useState, useEffect, useCallback } from 'react';
import { Table, OrderItem, OrderStatus, AppState, AppView } from './types';
import Dashboard from './components/Dashboard';
import TableView from './components/TableView';
import SplashScreen from './components/SplashScreen';
import LoginPage from './components/LoginPage';
import { initialTables, initialOrders } from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('dinesync_state');
    const initialState = saved ? JSON.parse(saved) : null;
    
    return {
      view: 'splash',
      isAuthenticated: initialState?.isAuthenticated || false,
      userName: initialState?.userName || null,
      currentTable: null,
      tables: initialState?.tables || initialTables,
      orders: initialState?.orders || initialOrders,
    };
  });

  // Handle splash transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        view: prev.isAuthenticated ? 'main' : 'login' 
      }));
    }, 2500);
    return () => clearTimeout(timer);
  }, [state.isAuthenticated]);

  useEffect(() => {
    // Only save core data, not temporary view state
    const { isAuthenticated, userName, tables, orders } = state;
    localStorage.setItem('dinesync_state', JSON.stringify({ isAuthenticated, userName, tables, orders }));
  }, [state]);

  const handleLogin = (user: string, pass: string) => {
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      userName: user,
      view: 'main'
    }));
  };

  const handleLogout = () => {
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      userName: null,
      view: 'login',
      currentTable: null
    }));
  };

  const handleSelectTable = (tableNo: string) => {
    setState(prev => ({ ...prev, currentTable: tableNo }));
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, currentTable: null }));
  };

  const handleDeleteItem = (itemId: string, waiterCode: string) => {
    if (waiterCode.length < 3) return false;
    
    setState(prev => {
      const newOrders = prev.orders.filter(o => o.id !== itemId);
      return { ...prev, orders: newOrders };
    });
    return true;
  };

  const handleConfirmOrder = (tableNo: string, waiterCode: string, note: string) => {
    if (waiterCode.length < 3) return false;

    setState(prev => {
      const newOrders = prev.orders.map(order => {
        return order.status === OrderStatus.CART ? { 
          ...order, 
          status: OrderStatus.CONFIRMED, 
          order_taken_by: `Waiter #${waiterCode}`,
          note: note 
        } : order;
      });
      return { ...prev, orders: newOrders };
    });
    return true;
  };

  if (state.view === 'splash') {
    return <SplashScreen />;
  }

  if (state.view === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center p-4">
        {state.isAuthenticated && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200 shadow-inner">
              <span className="text-indigo-600 font-black text-xs uppercase">{state.userName?.[0]}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none">Logged in as</p>
              <p className="text-xs font-black text-slate-700 capitalize leading-tight">{state.userName}</p>
            </div>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 group"
        >
          <span>Sign Out</span>
          <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>

      <main className="flex-grow pb-12">
        {state.currentTable ? (
          <TableView 
            table={state.tables.find(t => t.table_no === state.currentTable)!}
            orders={state.orders}
            onBack={handleBack}
            onDelete={handleDeleteItem}
            onConfirm={handleConfirmOrder}
          />
        ) : (
          <Dashboard 
            tables={state.tables}
            orders={state.orders}
            onSelectTable={handleSelectTable}
          />
        )}
      </main>

      <footer className="py-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
          Powered by <span className="text-indigo-400/60 font-black">Dyna-menu</span>
        </p>
      </footer>
    </div>
  );
};

export default App;
