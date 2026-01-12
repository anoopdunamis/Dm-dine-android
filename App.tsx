import React, { useState, useEffect, useCallback } from 'react';
import { Table, OrderItem, OrderStatus, AppState } from './types';
import Dashboard from './components/Dashboard';
import TableView from './components/TableView';
import SplashScreen from './components/SplashScreen';
import LoginPage from './components/LoginPage';
import { initialTables, initialOrders } from './constants';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Configuration for API
const API_ENABLED = true; 
const API_BASE_URL = 'https://dm-outlet.com/dmfp/administrator/'; 
const STATIC_RS_ID = '179';

const App: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
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

  const [isLoading, setIsLoading] = useState(false);

  // Catch the install prompt for Android/PWA
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  /**
   * Universal fetch wrapper.
   * On Native: Uses CapacitorHttp (Bypasses CORS).
   * On Web: Uses standard fetch (Subject to CORS).
   */
  const makeRequest = async (url: string, options: any = {}) => {
    const method = options.method || 'GET';
    const isNative = Capacitor.isNativePlatform();
    
    // Construct Headers
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...options.headers,
    };

    // Only add Content-Type for write operations to avoid preflight on GET
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    try {
      if (isNative) {
        // NATIVE PATH: Bypasses CORS completely
        const response = await CapacitorHttp.request({
          url,
          method,
          headers,
          data: options.body ? JSON.parse(options.body) : undefined,
          connectTimeout: 10000,
          readTimeout: 10000
        });
        
        if (response.status >= 200 && response.status < 300) {
          return response.data;
        }
        throw new Error(`Native Server Error: ${response.status}`);
      } else {
        // WEB PATH: Subject to CORS. 
        const response = await fetch(url, {
          method,
          headers,
          body: options.body,
          mode: 'cors',
        });
        
        if (!response.ok) {
          throw new Error(`Web Fetch Error: ${response.status}`);
        }
        return await response.json();
      }
    } catch (err: any) {
      if (!isNative) {
        console.warn(`[CORS/Network Warning] API call to ${url} failed. If on Web, ensure the server supports CORS. Error: ${err.message}`);
      } else {
        console.error(`[Native API Error] ${url}:`, err.message);
      }
      throw err;
    }
  };

  const fetchTables = useCallback(async () => {
    if (!API_ENABLED) return;
    setIsLoading(true);
    try {
      // Append rs_id=179
      const data = await makeRequest(`${API_BASE_URL}api_tables.php?rs_id=${STATIC_RS_ID}`);
      if (data && !data.error && Array.isArray(data)) {
        setState(prev => ({ ...prev, tables: data }));
      } else if (data && data.error) {
        console.error("Server returned API error for tables:", data.error);
      }
    } catch (err) {
      // Keep existing
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (tableNo: string) => {
    if (!API_ENABLED) return;
    setIsLoading(true);
    try {
      // Append table_no and rs_id=179
      const data = await makeRequest(`${API_BASE_URL}api_orders.php?table_no=${tableNo}&rs_id=${STATIC_RS_ID}`);
      if (data && !data.error && Array.isArray(data)) {
        setState(prev => ({ ...prev, orders: data }));
      } else if (data && data.error) {
        console.error("Server returned API error for orders:", data.error);
      }
    } catch (err) {
      // Keep existing
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    if (state.view === 'main' && !state.currentTable) {
      fetchTables();
    }
  }, [state.view, state.currentTable, fetchTables]);

  useEffect(() => {
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
    fetchOrders(tableNo);
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, currentTable: null }));
    fetchTables();
  };

  const handleDeleteItem = async (itemId: string, waiterCode: string) => {
    if (waiterCode.length < 3) return false;
    
    if (API_ENABLED) {
        setIsLoading(true);
        try {
            // Append rs_id=179 to the POST URL
            const data = await makeRequest(`${API_BASE_URL}api_delete_item.php?rs_id=${STATIC_RS_ID}`, {
                method: 'POST',
                body: JSON.stringify({ item_id: itemId, waiter_code: waiterCode })
            });
            if (data.error) throw new Error(data.error);
            if (state.currentTable) fetchOrders(state.currentTable);
            return true;
        } catch (err: any) {
            alert(err.message || "Failed to delete item. Please check your connection.");
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    setState(prev => {
      const newOrders = prev.orders.filter(o => o.id !== itemId);
      return { ...prev, orders: newOrders };
    });
    return true;
  };

  const handleConfirmOrder = async (tableNo: string, waiterCode: string, note: string) => {
    if (waiterCode.length < 3) return false;

    if (API_ENABLED) {
        setIsLoading(true);
        try {
            // Append rs_id=179 to the POST URL
            const data = await makeRequest(`${API_BASE_URL}api_confirm_order.php?rs_id=${STATIC_RS_ID}`, {
                method: 'POST',
                body: JSON.stringify({ table_no: tableNo, waiter_code: waiterCode, note })
            });
            if (data.error) throw new Error(data.error);
            fetchOrders(tableNo);
            return true;
        } catch (err: any) {
            alert(err.message || "Failed to confirm order. Please check your connection.");
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    setState(prev => {
      const newOrders = prev.orders.map(order => {
        return order.status === OrderStatus.CART ? { 
          ...order, 
          status: OrderStatus.CONFIRMED, 
          order_taken_by: `Waiter #${waiterCode}`,
          note: note 
        } : order;
      });
      return { ...prev, orders: newOrders, tables: prev.tables.map(t => t.table_no === tableNo ? {...t, status: 'occupied'} : t) };
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
    <div className="h-full bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-hidden">
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-indigo-500 z-50 overflow-hidden">
          <div className="w-full h-full bg-indigo-300 animate-[loading_1.5s_infinite_ease-in-out]"></div>
        </div>
      )}
      
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center p-4 flex-shrink-0">
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
        <div className="flex gap-4 items-center">
            {!state.currentTable && (
                <button 
                  onClick={fetchTables} 
                  disabled={isLoading}
                  className="p-2 text-slate-300 hover:text-indigo-500 disabled:opacity-50"
                >
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            )}
            <button 
                onClick={handleLogout}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 group"
            >
                <span>Sign Out</span>
                <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
        </div>
      </div>

      <main className="flex-grow overflow-y-auto">
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
            onInstall={deferredPrompt ? handleInstallClick : undefined}
          />
        )}
      </main>

      <footer className="py-8 text-center bg-slate-50 border-t border-slate-100 flex-shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
          Powered by <span className="text-indigo-400/60 font-black">Dyna-menu</span>
        </p>
      </footer>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;