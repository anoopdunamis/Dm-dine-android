import React, { useState, useEffect, useCallback } from 'react';
import { Table, OrderItem, OrderStatus, AppState } from './types';
import Dashboard from './components/Dashboard';
import TableView from './components/TableView';
import SplashScreen from './components/SplashScreen';
import LoginPage from './components/LoginPage';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Configuration for API
const API_ENABLED = true; 
const API_BASE_URL = 'https://dm-outlet.com/dmfp/administrator/json/'; 
const STATIC_RS_ID = '235';

/**
 * List of proxies to try sequentially if the direct request or previous proxy fails.
 * Proxies help bypass CORS and sometimes 403 Forbidden errors caused by origin-based blocking.
 */
const PROXIES = [
  { name: 'Direct', prefix: '' },
  { name: 'CORSProxy.io', prefix: 'https://corsproxy.io/?' },
  { name: 'AllOrigins', prefix: 'https://api.allorigins.win/raw?url=' }
];

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
      tables: [], 
      orders: [],
    };
  });

  const [isLoading, setIsLoading] = useState(false);

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
   * Universal fetch wrapper with multi-proxy fallback logic.
   */
  const makeRequest = async (url: string, options: any = {}, proxyIndex: number = 0) => {
    const method = options.method || 'GET';
    const platform = Capacitor.getPlatform();
    const isNative = platform === 'ios' || platform === 'android';
    
    // If native, we use CapacitorHttp (no CORS issues).
    // If web, we try Direct, then Proxies sequentially.
    const currentProxy = PROXIES[proxyIndex];
    const finalUrl = (!isNative && currentProxy.prefix) 
      ? `${currentProxy.prefix}${encodeURIComponent(url)}` 
      : url;
    
    console.debug(`[DynaSync] ${method} attempt ${proxyIndex + 1} (${currentProxy.name}): ${finalUrl}`);

    try {
      if (isNative) {
        const response = await CapacitorHttp.request({
          url,
          method,
          headers: {
            'Accept': 'application/json',
            ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
          },
          data: options.body ? JSON.parse(options.body) : undefined,
          connectTimeout: 15000,
          readTimeout: 15000
        });

        if (response.status >= 200 && response.status < 300) return response.data;
        throw new Error(`Status ${response.status}`);
      } else {
        const fetchOptions: RequestInit = {
          method,
          credentials: 'omit',
        };

        if (method !== 'GET') {
          fetchOptions.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
          };
          if (options.body) fetchOptions.body = options.body;
        }

        const response = await fetch(finalUrl, fetchOptions);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      }
    } catch (err: any) {
      console.warn(`[DynaSync] ${currentProxy.name} failed: ${err.message}`);
      
      // Fallback logic for web: Try the next proxy in the list
      if (!isNative && proxyIndex < PROXIES.length - 1) {
        return makeRequest(url, options, proxyIndex + 1);
      }
      
      throw err;
    }
  };

  const fetchTables = useCallback(async () => {
    if (!API_ENABLED) return;
    setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_tables.php?rs_id=${STATIC_RS_ID}`);
      console.log("Tables Response:", response);
      
      let tableData: any[] = [];
      if (Array.isArray(response)) {
        tableData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        tableData = response.data;
      } else if (response && response.tables && Array.isArray(response.tables)) {
        tableData = response.tables;
      }

      const mappedTables: Table[] = tableData.map((t: any) => {
        const rawStatus = String(t.status || t.table_status || '').toLowerCase();
        const isOccupied = rawStatus.includes('occupied') || 
                          rawStatus.includes('busy') || 
                          rawStatus === '1' || 
                          rawStatus === 'true' ||
                          rawStatus === 'placed' ||
                          rawStatus === 'active';
        
        return {
          table_no: String(t.table_no || t.no || t.table_id || t.id || '??'),
          status: isOccupied ? 'occupied' : 'inactive',
          guest_count: Number(t.guest_count || t.guests) || 0,
          tax: Number(t.tax || t.service_charge || 0)
        };
      });

      setState(prev => ({ ...prev, tables: mappedTables }));
    } catch (err) {
      console.error("fetchTables ultimate failure:", err);
      setState(prev => ({ ...prev, tables: [] }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (tableNo: string) => {
    if (!API_ENABLED) return;
    setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_orders.php?table_no=${tableNo}&rs_id=${STATIC_RS_ID}`);
      
      let orderData: any[] = [];
      if (Array.isArray(response)) {
        orderData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        orderData = response.data;
      }

      const mappedOrders: OrderItem[] = orderData.map((o: any) => ({
        id: String(o.id || o.sub_id || Math.random().toString(36).substr(2, 9)),
        food_name: o.food_name || o.item_name || 'Item',
        food_item_price: Number(o.food_item_price || o.price) || 0,
        food_quantity: Number(o.food_quantity || o.quantity || 1) || 1,
        status: (o.status as OrderStatus) || OrderStatus.CONFIRMED,
        sub_id: String(o.sub_id || ''),
        master_order_id: String(o.master_order_id || ''),
        preferences: Array.isArray(o.preferences) ? o.preferences : [],
        order_taken_by: o.order_taken_by || o.waiter || 'Staff',
        note: o.note || o.instruction || ''
      }));

      setState(prev => ({ ...prev, orders: mappedOrders }));
    } catch (err) {
      console.error("fetchOrders failure:", err);
      setState(prev => ({ ...prev, orders: [] }));
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
    setIsLoading(true);
    try {
        await makeRequest(`${API_BASE_URL}api_delete_item.php?rs_id=${STATIC_RS_ID}`, {
            method: 'POST',
            body: JSON.stringify({ item_id: itemId, waiter_code: waiterCode })
        });
        if (state.currentTable) fetchOrders(state.currentTable);
        return true;
    } catch (err: any) {
        alert("Action failed. Please check network.");
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  const handleConfirmOrder = async (tableNo: string, waiterCode: string, note: string) => {
    if (waiterCode.length < 3) return false;
    setIsLoading(true);
    try {
        await makeRequest(`${API_BASE_URL}api_confirm_order.php?rs_id=${STATIC_RS_ID}`, {
            method: 'POST',
            body: JSON.stringify({ table_no: tableNo, waiter_code: waiterCode, note })
        });
        fetchOrders(tableNo);
        return true;
    } catch (err: any) {
        alert("Action failed. Please check network.");
        return false;
    } finally {
        setIsLoading(false);
    }
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
                  aria-label="Refresh Tables"
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
            table={state.tables.find(t => t.table_no === state.currentTable) || { table_no: state.currentTable, status: 'inactive', guest_count: 0, tax: 0 }}
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