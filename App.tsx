import React, { useState, useEffect, useCallback } from 'react';
import { Table, OrderItem, OrderStatus, AppState, UserInfo } from './types';
import Dashboard from './components/Dashboard';
import TableView from './components/TableView';
import SplashScreen from './components/SplashScreen';
import LoginPage from './components/LoginPage';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Configuration for API
const API_ENABLED = true; 
const API_BASE_URL = 'https://dm-outlet.com/dmfp/administrator/json/'; 

const App: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('dinesync_state_v2');
    const initialState = saved ? JSON.parse(saved) : null;
    
    return {
      view: 'splash',
      isAuthenticated: initialState?.isAuthenticated || false,
      user: initialState?.user || { id: null, name: null, role: null },
      rsId: initialState?.rsId || null,
      currentTable: null,
      tables: [], 
      orders: [],
    };
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (errorStatus) {
      const timer = setTimeout(() => setErrorStatus(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [errorStatus]);

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

  const makeRequest = async (url: string, options: any = {}) => {
    const method = options.method || 'GET';
    const platform = Capacitor.getPlatform();
    const isNative = platform === 'ios' || platform === 'android';
    
    try {
      if (isNative) {
        // Native context (iOS/Android) bypasses CORS automatically
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

        if (response.status >= 200 && response.status < 300) {
            return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        }
        throw new Error(response.data?.message || `Server Status ${response.status}`);
      } else {
        // Web/Browser Context: Robust CORS Fetch
        const fetchOptions: RequestInit = {
          method,
          mode: 'cors',
          credentials: 'omit', // Crucial for '*' Access-Control-Allow-Origin
          headers: {}
        };

        if (method === 'POST' && options.body) {
          try {
            const bodyObj = JSON.parse(options.body);
            const params = new URLSearchParams();
            Object.keys(bodyObj).forEach(key => params.append(key, bodyObj[key]));
            fetchOptions.body = params;
            // No need to set Content-Type header manually for URLSearchParams, 
            // the browser sets it to application/x-www-form-urlencoded.
          } catch (e) {
            fetchOptions.body = options.body;
          }
        }

        const response = await fetch(url, fetchOptions);
        const text = await response.text();

        // Robust JSON parser to handle PHP error noise or whitespace
        const jsonStart = Math.max(text.indexOf('{'), text.indexOf('['));
        const jsonEnd = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
        
        let cleanText = text;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            cleanText = text.substring(jsonStart, jsonEnd + 1);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        try {
          return JSON.parse(cleanText);
        } catch (e) {
          console.error("Parse Error. Raw text:", text);
          throw new Error("Server response was not valid JSON. Possible PHP script error.");
        }
      }
    } catch (err: any) {
      console.error(`Request Failed [${method}] ${url}:`, err);
      if (err.message === 'Failed to fetch') {
        throw new Error('Connection Aborted. Please check server CORS headers or SSL certificate validity.');
      }
      throw err;
    }
  };

  const fetchTables = useCallback(async () => {
    if (!API_ENABLED || !state.rsId) return;
    setIsLoading(true);
    setErrorStatus(null);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_tables.php?rs_id=${state.rsId}`);
      
      let tableData: any[] = [];
      if (Array.isArray(response)) tableData = response;
      else if (response?.data && Array.isArray(response.data)) tableData = response.data;
      else if (response?.tables && Array.isArray(response.tables)) tableData = response.tables;

      const mappedTables: Table[] = tableData.map((t: any) => {
        const rawStatus = String(t.status || t.table_status || t.tab_status || '').toLowerCase();
        const isOccupied = rawStatus.includes('occupied') || rawStatus.includes('busy') || rawStatus === '1' || rawStatus === 'active';
        
        return {
          table_no: String(t.table_no || t.no || t.table_id || t.id || '??'),
          status: isOccupied ? 'occupied' : 'inactive',
          guest_count: Number(t.guest_count || t.guests) || 0,
          tax: Number(t.tax || t.service_charge || 0)
        };
      });

      setState(prev => ({ ...prev, tables: mappedTables }));
    } catch (err: any) {
      setErrorStatus(`Table Sync: ${err.message}`);
      setState(prev => ({ ...prev, tables: [] }));
    } finally {
      setIsLoading(false);
    }
  }, [state.rsId]);

  const fetchOrders = useCallback(async (tableNo: string) => {
    if (!API_ENABLED || !state.rsId) return;
    setIsLoading(true);
    setErrorStatus(null);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_orders.php?table_no=${tableNo}&rs_id=${state.rsId}`);
      
      let orderData: any[] = [];
      if (Array.isArray(response)) orderData = response;
      else if (response?.data && Array.isArray(response.data)) orderData = response.data;

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
    } catch (err: any) {
      setErrorStatus(`Order Sync: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [state.rsId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setState(prev => ({ ...prev, view: prev.isAuthenticated ? 'main' : 'login' }));
    }, 2500);
    return () => clearTimeout(timer);
  }, [state.isAuthenticated]);

  useEffect(() => {
    if (state.view === 'main' && !state.currentTable && state.rsId) {
      fetchTables();
    }
  }, [state.view, state.currentTable, state.rsId, fetchTables]);

  useEffect(() => {
    const { isAuthenticated, user, rsId, tables, orders } = state;
    localStorage.setItem('dinesync_state_v2', JSON.stringify({ isAuthenticated, user, rsId, tables, orders }));
  }, [state]);

  const handleLogin = async (user: string, pass: string) => {
    setIsLoading(true);
    setErrorStatus(null);
    try {
        const response = await makeRequest(`${API_BASE_URL}api_auth.php`, {
            method: 'POST',
            body: JSON.stringify({ username: user, password: pass })
        });

        if (response.status === 'success' || (response.rs_id && !response.error)) {
            const rsId = String(response.rs_id || response.rsId);
            const userInfo: UserInfo = {
                id: String(response.user_id || response.id || ''),
                name: response.user_name || response.name || user,
                role: response.role || response.user_role || 'Staff',
                restaurantName: response.restaurant_name || response.outlet_name || null
            };

            setState(prev => ({
                ...prev,
                isAuthenticated: true,
                user: userInfo,
                rsId: rsId,
                view: 'main'
            }));
            return true;
        } else {
            throw new Error(response.message || response.error || 'Authentication Denied');
        }
    } catch (err: any) {
        setErrorStatus(err.message);
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: { id: null, name: null, role: null },
      rsId: null,
      view: 'login',
      currentTable: null,
      tables: [],
      orders: []
    }));
    localStorage.removeItem('dinesync_state_v2');
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
    if (waiterCode.length < 3 || !state.rsId) return false;
    setIsLoading(true);
    try {
        await makeRequest(`${API_BASE_URL}api_delete_item.php?rs_id=${state.rsId}`, {
            method: 'POST',
            body: JSON.stringify({ item_id: itemId, waiter_code: waiterCode })
        });
        if (state.currentTable) fetchOrders(state.currentTable);
        return true;
    } catch (err: any) {
        setErrorStatus(`Delete Error: ${err.message}`);
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  const handleConfirmOrder = async (tableNo: string, waiterCode: string, note: string) => {
    if (waiterCode.length < 3 || !state.rsId) return false;
    setIsLoading(true);
    try {
        await makeRequest(`${API_BASE_URL}api_confirm_order.php?rs_id=${state.rsId}`, {
            method: 'POST',
            body: JSON.stringify({ table_no: tableNo, waiter_code: waiterCode, note })
        });
        fetchOrders(tableNo);
        return true;
    } catch (err: any) {
        setErrorStatus(`Confirm Error: ${err.message}`);
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  if (state.view === 'splash') return <SplashScreen />;
  if (state.view === 'login') return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="h-full bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-hidden">
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-indigo-500 z-[70] overflow-hidden">
          <div className="w-full h-full bg-indigo-300 animate-[loading_1.5s_infinite_ease-in-out]"></div>
        </div>
      )}

      {errorStatus && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300">
            <div className="bg-rose-500 p-2 rounded-xl flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Connection Error</p>
              <p className="text-sm font-bold leading-snug break-words">{errorStatus}</p>
            </div>
            <button onClick={() => setErrorStatus(null)} className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0">✕</button>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          {state.isAuthenticated && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                <span className="text-white font-black text-sm uppercase">{state.user.name?.[0]}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{state.user.role || 'Staff'}</p>
                <p className="text-xs font-black text-slate-700 capitalize leading-tight">{state.user.name}</p>
              </div>
            </div>
          )}
          <div className="h-6 w-px bg-slate-100 mx-1"></div>
          <div className="text-right">
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">Sync</p>
            <p className="text-xs font-black text-slate-600 tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
            {!state.currentTable && (
                <button onClick={fetchTables} disabled={isLoading} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all disabled:opacity-50">
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            )}
            <button onClick={handleLogout} className="bg-slate-900 text-white text-[10px] font-black uppercase px-4 py-2.5 rounded-xl hover:bg-rose-600 active:scale-95 transition-all">Log Out</button>
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
            restaurantName={state.user.restaurantName}
          />
        )}
      </main>

      <footer className="py-6 text-center bg-white border-t border-slate-100 flex-shrink-0 safe-bottom">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
          Sync Point: <span className="text-slate-800 font-bold">{state.rsId || 'AUTH_REQD'}</span>
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