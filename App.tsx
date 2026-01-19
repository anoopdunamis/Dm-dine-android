import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, OrderItem, OrderStatus, AppState, UserInfo, OrderInfo, ItemPreference } from './types';
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncError, setSyncError] = useState(false);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('dinesync_state_v2');
    const initialState = saved ? JSON.parse(saved) : null;
    
    return {
      view: 'splash',
      isAuthenticated: initialState?.isAuthenticated || false,
      user: initialState?.user || { id: null, name: null, role: null, restaurantName: null },
      rsId: initialState?.rsId || null,
      currentTable: null,
      tables: [], 
      orders: [],
      orderInfo: null
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const stateRef = useRef(state);
  
  useEffect(() => { 
    stateRef.current = state;
    // Persist essential state to localStorage
    const stateToSave = {
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      rsId: state.rsId
    };
    localStorage.setItem('dinesync_state_v2', JSON.stringify(stateToSave));
  }, [state]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
    
    let bodyObj: any = {};
    if (options.body) {
      try {
        bodyObj = JSON.parse(options.body);
      } catch (e) {
        console.error("Payload parse error", e);
      }
    }

    try {
      if (isNative) {
        // CapacitorHttp handles serialization based on Content-Type header
        const response = await CapacitorHttp.request({
          url,
          method,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: bodyObj, 
          connectTimeout: 20000,
          readTimeout: 20000
        });
        const rawData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const cleanedText = cleanJsonResponse(rawData);
        if (response.status >= 200 && response.status < 400) {
          try { return JSON.parse(cleanedText); } catch (e) { throw new Error("Invalid server response format."); }
        }
        throw new Error(response.data?.message || `Server Error ${response.status}`);
      } else {
        const params = new URLSearchParams();
        Object.keys(bodyObj).forEach(key => params.append(key, bodyObj[key]));
        
        const fetchOptions: RequestInit = {
          method,
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        };
        const response = await fetch(url, fetchOptions);
        const text = await response.text();
        const cleanedText = cleanJsonResponse(text);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        try { return JSON.parse(cleanedText); } catch (e) { throw new Error("Could not read server response."); }
      }
    } catch (err: any) {
      console.error(`API Error [${url}]:`, err);
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
      let tableData: any[] = response?.tables || (Array.isArray(response) ? response : []);
      const mappedTables: Table[] = tableData.map((t: any) => {
        const rawStatus = String(t.status || t.table_status || '').toLowerCase();
        return {
          table_no: String(t.table_no || t.id || '??'),
          status: (rawStatus === 'occupied' || rawStatus === '1') ? 'occupied' : 'inactive',
          guest_count: Number(t.guest_order_type || t.guest_count || 0),
          tax: Number(t.tax || 0),
          master_order_id: t.master_order_id || null
        };
      });
      setState(prev => ({ ...prev, tables: mappedTables }));
      setSyncError(false);
    } catch (err: any) {
      setSyncError(true);
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
      let orderItems: any[] = response?.order_items || [];
      let orderInfo: OrderInfo | null = response?.orders_info?.[0] || null;
      const mappedOrders: OrderItem[] = orderItems.map((o: any) => {
        let mappedStatus = OrderStatus.CONFIRMED;
        const apiStatus = String(o.order_item_status || '').toLowerCase();
        if (apiStatus.includes('initial') || apiStatus.includes('cart')) mappedStatus = OrderStatus.CART;
        else if (apiStatus.includes('placed')) mappedStatus = OrderStatus.OCCUPIED;
        else if (apiStatus.includes('delivered') || apiStatus.includes('prepared')) mappedStatus = OrderStatus.PREPARED;
        
        const prefString = o.food_preferencess_names || '';
        const mappedPreferences = prefString 
          ? prefString.split('@').filter(Boolean).map((p: string) => ({ name: p.trim(), price: 0 }))
          : [];

        return {
          id: String(o.id || ''),
          food_id: String(o.Item_Id || o.food_id || ''), // Capturing Item_Id for preferences API
          food_name: o.food_name || 'Item',
          food_item_price: Number(o.food_item_price || 0),
          food_quantity: Number(o.food_quantity || 1),
          status: mappedStatus,
          sub_id: String(o.sub_id || ''),
          master_order_id: String(o.order_id || o.master_order_id || ''),
          preferences: mappedPreferences,
          order_taken_by: o.order_taken_by || 'Staff',
          note: o.food_note || o.note || '',
          food_type: o.food_type,
          food_image: o.food_image
        };
      });
      setState(prev => ({ ...prev, orders: mappedOrders, orderInfo }));
      setSyncError(false);
    } catch (err: any) {
      setSyncError(true);
      if (!silent) setErrorStatus(`Order Sync: ${err.message}`);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const fetchItemPreferences = useCallback(async (foodId: string): Promise<ItemPreference[]> => {
    if (!stateRef.current.rsId || !foodId) return [];
    try {
      const response = await makeRequest(`${API_BASE_URL}api_item_preferencess.php`, {
        body: JSON.stringify({ rs_id: stateRef.current.rsId, item_id: foodId })
      });
      // Handle various response structures
      const prefs = response?.preferencess || (Array.isArray(response) ? response : []);
      return prefs.map((p: any) => ({
        id: String(p.id || p.food_preferencess_id || ''),
        // Mapping 'food_preferencess' as it's the standard field for this API
        name: p.food_preferencess || p.name || p.preference_name || ''
      }));
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
      return [];
    }
  }, []); // uses stateRef so safe to have empty deps

  useEffect(() => {
    if (state.view === 'splash') {
      setTimeout(() => setState(prev => ({ ...prev, view: prev.isAuthenticated ? 'main' : 'login' })), 2000);
    }
  }, [state.view]);

  useEffect(() => {
    if (state.view === 'main' && !state.currentTable && state.rsId) fetchTables();
  }, [state.view, state.currentTable, state.rsId]);

  useEffect(() => {
    if (!state.isAuthenticated || state.view !== 'main' || !state.rsId) return;
    const interval = setInterval(() => {
      const cur = stateRef.current;
      if (cur.currentTable) {
        const t = cur.tables.find(tbl => tbl.table_no === cur.currentTable);
        fetchOrders(cur.currentTable, t?.master_order_id, true);
      } else fetchTables(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.view, state.rsId]);

  const handleLogin = async (user: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_auth.php`, {
        body: JSON.stringify({ username: user, password: pass })
      });
      const userData = response.user || {};
      const rsId = String(userData.rs_id || response.rs_id || '');
      
      if ((response.success === true || response.status === 'success') && rsId) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          rsId,
          user: { 
            id: String(userData.id || ''), 
            name: userData.name || user, 
            role: userData.user_type === '1' ? 'Admin' : 'Staff', 
            restaurantName: userData.restaurant_name
          },
          view: 'main'
        }));
        return true;
      }
      throw new Error(response.message || 'Login failed');
    } catch (err: any) { setErrorStatus(err.message); return false; } finally { setIsLoading(false); }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false, view: 'login', currentTable: null, user: { id: null, name: null, role: null, restaurantName: null }, rsId: null }));
    localStorage.removeItem('dinesync_state_v2');
  };

  const handleSelectTable = (tableNo: string) => {
    const t = state.tables.find(tbl => tbl.table_no === tableNo);
    setState(prev => ({ ...prev, currentTable: tableNo, orderInfo: null }));
    fetchOrders(tableNo, t?.master_order_id);
  };

  const handleRefreshCurrentTable = async () => {
    if (state.currentTable) {
      const t = state.tables.find(tbl => tbl.table_no === state.currentTable);
      await fetchOrders(state.currentTable, t?.master_order_id);
    }
  };

  const handleDeleteItem = async (itemId: string, waiterCode: string) => {
    if (!state.rsId) return false;
    setIsLoading(true);
    try {
      const currentT = state.tables.find(t => t.table_no === state.currentTable);
      const mId = state.orderInfo?.master_order_id || currentT?.master_order_id || '';
      await makeRequest(`${API_BASE_URL}api_delete_item.php`, {
        body: JSON.stringify({ rs_id: state.rsId, id: itemId, waiter_code: waiterCode, master_order_id: mId })
      });
      if (state.currentTable) fetchOrders(state.currentTable, mId);
      return true;
    } catch (err: any) { setErrorStatus(`Delete failed: ${err.message}`); return false; } finally { setIsLoading(false); }
  };

  const handleConfirmItem = async (itemId: string, waiterCode: string, note: string) => {
    if (!state.rsId) return false;
    setIsLoading(true);
    try {
      const currentT = state.tables.find(t => t.table_no === state.currentTable);
      const mId = state.orderInfo?.master_order_id || currentT?.master_order_id || '';
      await makeRequest(`${API_BASE_URL}api_confirm_order.php`, {
        body: JSON.stringify({ rs_id: state.rsId, id: itemId, waiter_code: waiterCode, note, master_order_id: mId })
      });
      if (state.currentTable) fetchOrders(state.currentTable, mId);
      return true;
    } catch (err: any) { setErrorStatus(`Confirm failed: ${err.message}`); return false; } finally { setIsLoading(false); }
  };

  const handleEditItem = async (itemId: string, quantity: number, preferences: string) => {
    if (!state.rsId) return false;
    setIsLoading(true);
    try {
      const currentT = state.tables.find(t => t.table_no === state.currentTable);
      const mId = state.orderInfo?.master_order_id || currentT?.master_order_id || '';
      // Endpoint updated to include the space as specified in requirement
      await makeRequest(`${API_BASE_URL}api_edit_item .php`, {
        body: JSON.stringify({ 
          rs_id: state.rsId, 
          master_order_id: mId,
          id: itemId, 
          food_quantity: quantity, 
          food_preferencess: preferences 
        })
      });
      if (state.currentTable) fetchOrders(state.currentTable, mId);
      return true;
    } catch (err: any) { 
      setErrorStatus(`Edit failed: ${err.message}`); 
      return false; 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleConfirmAllItems = async (waiterCode: string, note: string) => {
    if (!state.rsId || !state.currentTable) return false;
    setIsLoading(true);
    try {
      const currentT = state.tables.find(t => t.table_no === state.currentTable);
      const mId = state.orderInfo?.master_order_id || currentT?.master_order_id || '';
      await makeRequest(`${API_BASE_URL}api_confirm_all_items.php`, {
        body: JSON.stringify({ 
          rs_id: state.rsId, 
          master_order_id: mId, 
          waiter_code: waiterCode, 
          note 
        })
      });
      fetchOrders(state.currentTable, mId);
      return true;
    } catch (err: any) {
      setErrorStatus(`Bulk Confirm failed: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = async (tableNo: string, waiterCode: string, note: string) => {
    if (!state.rsId) return false;
    setIsLoading(true);
    try {
      const t = state.tables.find(tbl => tbl.table_no === tableNo);
      await makeRequest(`${API_BASE_URL}api_confirm_order.php`, {
        body: JSON.stringify({ rs_id: state.rsId, table_no: tableNo, waiter_code: waiterCode, note, master_order_id: t?.master_order_id || '' })
      });
      fetchOrders(tableNo, t?.master_order_id);
      return true;
    } catch (err: any) { setErrorStatus(`Table Confirm failed: ${err.message}`); return false; } finally { setIsLoading(false); }
  };

  if (state.view === 'splash') return <SplashScreen />;
  if (state.view === 'login') return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden">
      {isLoading && <div className="fixed top-0 left-0 w-full h-1 bg-indigo-500 z-[70] overflow-hidden"><div className="w-full h-full bg-indigo-300 animate-[loading_1.5s_infinite]"></div></div>}
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center px-4 py-3 bg-white border-b border-slate-100 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><span className="text-white font-black text-sm">{state.user.name?.[0]}</span></div>
          <div className="text-right ml-4"><p className="text-[9px] font-black text-indigo-500 uppercase">Sync</p><p className="text-xs font-black text-slate-600">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
        </div>
        <div className="flex gap-2">
          {!state.currentTable && <button onClick={() => fetchTables()} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl"><svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="3" /></svg></button>}
          <button onClick={handleLogout} className="bg-slate-900 text-white text-[10px] font-black uppercase px-4 py-2.5 rounded-xl">Log Out</button>
        </div>
      </div>
      <main className="flex-grow overflow-y-auto">
        {state.currentTable ? (
          <TableView 
            table={state.tables.find(t => t.table_no === state.currentTable) || { table_no: state.currentTable, status: 'inactive', guest_count: 0, tax: 0 }}
            orders={state.orders}
            orderInfo={state.orderInfo}
            onBack={() => setState(prev => ({ ...prev, currentTable: null, orders: [], orderInfo: null }))}
            onDelete={handleDeleteItem}
            onConfirm={handleConfirmOrder}
            onConfirmItem={handleConfirmItem}
            onEditItem={handleEditItem}
            onFetchItemPreferences={fetchItemPreferences}
            onConfirmAll={handleConfirmAllItems}
            onRefresh={handleRefreshCurrentTable}
          />
        ) : (
          <Dashboard 
            tables={state.tables} 
            orders={state.orders} 
            onSelectTable={handleSelectTable} 
            restaurantName={state.user.restaurantName} 
            onInstall={handleInstallClick} 
            isOnline={isOnline}
            syncError={syncError}
          />
        )}
      </main>
      <footer className="py-4 text-center bg-white border-t border-slate-100"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sync: <span className="text-slate-800">{state.rsId}</span></p></footer>
      <style>{`
        @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes drift {
          0% { transform: translateX(-50%) skewY(0deg); }
          50% { transform: translateX(0%) skewY(2deg); }
          100% { transform: translateX(-50%) skewY(0deg); }
        }
      `}</style>
    </div>
  );
};

export default App;