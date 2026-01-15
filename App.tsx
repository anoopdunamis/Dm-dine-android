import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, OrderItem, OrderStatus, AppState, UserInfo, OrderInfo } from './types';
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
      orderInfo: null
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (errorStatus) {
      const timer = setTimeout(() => setErrorStatus(null), 8000);
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

  /**
   * Robust JSON extraction to handle PHP noise (warnings/notices)
   */
  const cleanJsonResponse = (text: string): string => {
    if (typeof text !== 'string') return JSON.stringify(text);
    
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let jsonStart = -1;
    if (firstBrace !== -1 && firstBracket !== -1) jsonStart = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1) jsonStart = firstBrace;
    else if (firstBracket !== -1) jsonStart = firstBracket;

    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    const jsonEnd = Math.max(lastBrace, lastBracket);
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      return text.substring(jsonStart, jsonEnd + 1);
    }
    return text;
  };

  const makeRequest = async (url: string, options: any = {}) => {
    const method = 'POST';
    const platform = Capacitor.getPlatform();
    const isNative = platform === 'ios' || platform === 'android';
    
    // Convert body to URLSearchParams for application/x-www-form-urlencoded
    const params = new URLSearchParams();
    if (options.body) {
      try {
        const bodyObj = JSON.parse(options.body);
        Object.keys(bodyObj).forEach(key => params.append(key, bodyObj[key]));
      } catch (e) {
        console.error("Payload parse error", e);
      }
    }

    const serializedBody = params.toString();
    
    try {
      if (isNative) {
        // Explicitly use CapacitorHttp for mobile to bypass CORS and handle cookies if needed
        const response = await CapacitorHttp.request({
          url,
          method,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: serializedBody, 
          connectTimeout: 20000,
          readTimeout: 20000
        });

        // Clean potentially noisy PHP output on native
        const rawData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const cleanedText = cleanJsonResponse(rawData);

        if (response.status >= 200 && response.status < 400) {
          try {
            return JSON.parse(cleanedText);
          } catch (e) {
            console.error("Native Parse failure:", rawData);
            throw new Error("Invalid server response format.");
          }
        }
        throw new Error(response.data?.message || `Server Error ${response.status}`);
      } else {
        const fetchOptions: RequestInit = {
          method,
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: serializedBody
        };

        const response = await fetch(url, fetchOptions);
        const text = await response.text();
        const cleanedText = cleanJsonResponse(text);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        try {
          if (!cleanedText.trim()) throw new Error("Empty response from server.");
          return JSON.parse(cleanedText);
        } catch (e) {
          console.error("Web Parse failure:", text);
          throw new Error("Could not read server response.");
        }
      }
    } catch (err: any) {
      console.error(`API Error [${url}]:`, err);
      if (err.message.includes('Failed to fetch')) {
        throw new Error('Connection failed. Please check your network.');
      }
      throw err;
    }
  };

  const fetchTables = useCallback(async (silent = false) => {
    if (!API_ENABLED || !stateRef.current.rsId) return;
    if (!silent) setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_tables.php`, {
        body: JSON.stringify({ rs_id: stateRef.current.rsId })
      });
      
      let tableData: any[] = [];
      if (response && response.tables && Array.isArray(response.tables)) {
        tableData = response.tables;
      } else if (Array.isArray(response)) {
        tableData = response;
      }

      const mappedTables: Table[] = tableData.map((t: any) => {
        const rawStatus = String(t.status || t.table_status || '').toLowerCase();
        return {
          table_no: String(t.table_no || t.id || '??'),
          status: (rawStatus === 'occupied' || rawStatus === '1') ? 'occupied' : 'inactive',
          guest_count: Number(t.guest_count || 0),
          tax: Number(t.tax || 0),
          master_order_id: t.master_order_id || null
        };
      });

      setState(prev => ({ ...prev, tables: mappedTables }));
    } catch (err: any) {
      if (!silent) setErrorStatus(`Table Sync: ${err.message}`);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (tableNo: string, masterOrderId?: string | null, silent = false) => {
    if (!API_ENABLED || !stateRef.current.rsId) return;
    if (!silent) setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_orders.php`, {
        body: JSON.stringify({ 
          table_no: tableNo, 
          rs_id: stateRef.current.rsId,
          master_order_id: masterOrderId || ''
        })
      });
      
      let orderItems: any[] = [];
      let orderInfo: OrderInfo | null = null;

      if (response && response.order_items && Array.isArray(response.order_items)) {
        orderItems = response.order_items;
      }
      
      if (response && response.orders_info && Array.isArray(response.orders_info) && response.orders_info.length > 0) {
        orderInfo = response.orders_info[0];
      }

      const mappedOrders: OrderItem[] = orderItems.map((o: any) => {
        let mappedStatus = OrderStatus.CONFIRMED;
        const apiStatus = String(o.order_item_status || '').toLowerCase();
        if (apiStatus.includes('initial') || apiStatus.includes('cart')) mappedStatus = OrderStatus.CART;
        else if (apiStatus.includes('placed')) mappedStatus = OrderStatus.OCCUPIED;
        else if (apiStatus.includes('delivered') || apiStatus.includes('prepared')) mappedStatus = OrderStatus.PREPARED;

        return {
          id: String(o.id || Math.random().toString(36).substr(2, 9)),
          food_name: o.food_name || 'Item',
          food_item_price: Number(o.food_item_price || o.food_price || 0),
          food_quantity: Number(o.food_quantity || 1),
          status: mappedStatus,
          sub_id: String(o.sub_id || ''),
          master_order_id: String(o.order_id || o.master_order_id || ''),
          preferences: [],
          order_taken_by: o.order_taken_by || 'Staff',
          note: o.food_note || o.note || '',
          food_type: o.food_type,
          food_image: o.food_image
        };
      });

      setState(prev => ({ ...prev, orders: mappedOrders, orderInfo }));
    } catch (err: any) {
      if (!silent) setErrorStatus(`Order Sync: ${err.message}`);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (state.view === 'splash') {
        const timer = setTimeout(() => {
            setState(prev => ({ ...prev, view: prev.isAuthenticated ? 'main' : 'login' }));
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [state.view, state.isAuthenticated]);

  useEffect(() => {
    if (state.view === 'main' && !state.currentTable && state.rsId) {
      fetchTables();
    }
  }, [state.view, state.currentTable, state.rsId, fetchTables]);

  useEffect(() => {
    if (!state.isAuthenticated || state.view !== 'main' || !state.rsId) return;

    const intervalId = setInterval(() => {
      const currentState = stateRef.current;
      if (currentState.currentTable) {
        const table = currentState.tables.find(t => t.table_no === currentState.currentTable);
        fetchOrders(currentState.currentTable, table?.master_order_id, true);
      } else {
        fetchTables(true);
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [state.isAuthenticated, state.view, state.rsId, fetchTables, fetchOrders]);

  useEffect(() => {
    const { isAuthenticated, user, rsId, tables, orders, orderInfo } = state;
    localStorage.setItem('dinesync_state_v2', JSON.stringify({ isAuthenticated, user, rsId, tables, orders, orderInfo }));
  }, [state]);

  const handleLogin = async (user: string, pass: string) => {
    setIsLoading(true);
    setErrorStatus(null);
    try {
        const response = await makeRequest(`${API_BASE_URL}api_auth.php`, {
            body: JSON.stringify({ username: user, password: pass })
        });

        const userData = response.user || {};
        const rsId = String(userData.rs_id || response.rs_id || '');
        const userId = String(userData.id || userData.user_id || '');
        const isSuccess = response.success === true || response.status === 'success';

        if (isSuccess && rsId) {
            const userInfo: UserInfo = {
                id: userId,
                name: userData.name || user,
                role: userData.user_type === '1' ? 'Admin' : 'Staff',
                restaurantName: response.restaurant_name || null
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
            throw new Error(response.message || 'Invalid username or password.');
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
      orders: [],
      orderInfo: null
    }));
    localStorage.removeItem('dinesync_state_v2');
  };

  const handleSelectTable = (tableNo: string) => {
    const table = state.tables.find(t => t.table_no === tableNo);
    setState(prev => ({ ...prev, currentTable: tableNo, orderInfo: null }));
    fetchOrders(tableNo, table?.master_order_id);
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, currentTable: null, orders: [], orderInfo: null }));
    fetchTables();
  };

  const handleDeleteItem = async (itemId: string, waiterCode: string) => {
    if (waiterCode.length < 3 || !state.rsId) return false;
    setIsLoading(true);
    try {
        const currentT = state.tables.find(t => t.table_no === state.currentTable);
        // Using 'id' as the key for the primary key as requested
        await makeRequest(`${API_BASE_URL}api_delete_item.php`, {
            body: JSON.stringify({ 
              rs_id: state.rsId, 
              id: itemId, 
              waiter_code: waiterCode,
              master_order_id: state.orderInfo?.master_order_id || currentT?.master_order_id || ''
            })
        });
        if (state.currentTable) {
            fetchOrders(state.currentTable, state.orderInfo?.master_order_id || currentT?.master_order_id);
        }
        return true;
    } catch (err: any) {
        setErrorStatus(`Delete failed: ${err.message}`);
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  const handleConfirmOrder = async (tableNo: string, waiterCode: string, note: string) => {
    if (waiterCode.length < 3 || !state.rsId) return false;
    setIsLoading(true);
    try {
        const currentT = state.tables.find(t => t.table_no === tableNo);
        await makeRequest(`${API_BASE_URL}api_confirm_order.php`, {
            body: JSON.stringify({ 
              rs_id: state.rsId, 
              table_no: tableNo, 
              waiter_code: waiterCode, 
              note,
              master_order_id: currentT?.master_order_id || ''
            })
        });
        fetchOrders(tableNo, currentT?.master_order_id);
        return true;
    } catch (err: any) {
        setErrorStatus(`Confirmation failed: ${err.message}`);
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
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Sync Warning</p>
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
                <button onClick={() => fetchTables()} disabled={isLoading} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all disabled:opacity-50">
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
            orderInfo={state.orderInfo}
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