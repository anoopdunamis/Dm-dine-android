
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, OrderItem, OrderStatus, AppState, UserInfo, OrderInfo, ItemPreference, Category, MenuItem, WaiterCall } from './types';
import Dashboard from './components/Dashboard';
import TableView from './components/TableView';
import SplashScreen from './components/SplashScreen';
import LoginPage from './components/LoginPage';
import { Capacitor } from '@capacitor/core';

// Configuration for API
const API_ENABLED = true; 
const API_BASE_URL = 'https://dm-outlet.com/dmfp/administrator/json/'; 

const App: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncError, setSyncError] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<WaiterCall[]>([]);
  
  // Track seen notification IDs to avoid duplicates
  const [seenCallIds, setSeenCallIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dinesync_seen_calls');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

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
      orderInfo: null,
      waiterCalls: []
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const stateRef = useRef(state);
  
  useEffect(() => { 
    stateRef.current = state;
    const stateToSave = {
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      rsId: state.rsId
    };
    localStorage.setItem('dinesync_state_v2', JSON.stringify(stateToSave));
  }, [state]);

  // Save seen IDs to persistent storage
  useEffect(() => {
    localStorage.setItem('dinesync_seen_calls', JSON.stringify(Array.from(seenCallIds)));
  }, [seenCallIds]);

  // Unified History and Back Gesture Management
  useEffect(() => {
    const syncStateWithHash = () => {
      const hash = window.location.hash;
      if (hash === '#/dashboard' || !hash || hash === '#/' || hash === '') {
        if (stateRef.current.currentTable !== null) {
          setState(prev => ({ ...prev, currentTable: null, orders: [], orderInfo: null }));
        }
      } else if (hash.startsWith('#/table/')) {
        const tableNo = hash.replace('#/table/', '');
        if (stateRef.current.currentTable !== tableNo) {
          setState(prev => ({ ...prev, currentTable: tableNo }));
        }
      }
    };
    window.addEventListener('hashchange', syncStateWithHash);
    if (state.isAuthenticated && state.view === 'main') {
      if (!window.location.hash || window.location.hash === '#/') {
        window.location.hash = '/dashboard';
      }
      syncStateWithHash();
    }
    return () => window.removeEventListener('hashchange', syncStateWithHash);
  }, [state.isAuthenticated, state.view]);

  // Native hardware button support
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener: any = null;
    const setupListener = async () => {
      const { App: CapApp } = await import('@capacitor/app');
      listener = await CapApp.addListener('backButton', () => {
        if (stateRef.current.currentTable) {
          window.history.back();
        } else if (stateRef.current.isAuthenticated && stateRef.current.view === 'main') {
          CapApp.exitApp();
        }
      });
    };
    setupListener();
    return () => { if (listener) listener.remove(); };
  }, []);

  // PWA Install logic
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerNotification = useCallback(async (call: WaiterCall) => {
    const title = `Table ${call.table_no}: Service Request`;
    const body = call.call_info || 'Waiter assistance required';

    // 1. Native Notification
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: parseInt(call.order_waiter_call_id) || Math.floor(Math.random() * 10000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              attachments: [],
              actionTypeId: '',
              extra: null,
            }
          ]
        });
      } catch (e) {
        console.error("Local notification error", e);
      }
    }

    // 2. Browser/In-app Toast
    setActiveNotifications(prev => {
      if (prev.some(p => p.order_waiter_call_id === call.order_waiter_call_id)) return prev;
      return [call, ...prev].slice(0, 3); // Max 3 toasts at once
    });

    // Auto-dismiss toast after 8 seconds
    setTimeout(() => {
      setActiveNotifications(prev => prev.filter(p => p.order_waiter_call_id !== call.order_waiter_call_id));
    }, 8000);
  }, []);

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
    if (jsonStart !== -1 && jsonEnd > jsonStart) return text.substring(jsonStart, jsonEnd + 1);
    return text;
  };

  const makeRequest = async (url: string, options: any = {}) => {
    const method = 'POST';
    const isNative = Capacitor.isNativePlatform();
    let bodyObj: any = {};
    if (options.body) {
      try { bodyObj = JSON.parse(options.body); } catch (e) { console.error("Payload parse error", e); }
    }
    try {
      if (isNative) {
        const { CapacitorHttp } = await import('@capacitor/core');
        const response = await CapacitorHttp.request({
          url,
          method,
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          data: bodyObj, 
          connectTimeout: 20000,
          readTimeout: 20000
        });
        const rawData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const cleanedText = cleanJsonResponse(rawData);
        if (response.status >= 200 && response.status < 400) {
          try { 
            const trimmed = (cleanedText || '').trim();
            if (!trimmed || trimmed === '' || (!trimmed.includes('{') && !trimmed.includes('['))) {
              if (url.includes('api_orders.php')) return { order_items: [], orders_info: [] };
              if (url.includes('api_tables.php')) return { tables: [], waiter_calls: [] };
              return {};
            }
            return JSON.parse(cleanedText); 
          } catch (e) { 
            if (url.includes('api_orders.php')) return { order_items: [], orders_info: [] };
            throw new Error("Invalid server response format."); 
          }
        }
        throw new Error(response.data?.message || `Server Error ${response.status}`);
      } else {
        const params = new URLSearchParams();
        Object.keys(bodyObj).forEach(key => params.append(key, bodyObj[key]));
        const fetchOptions: RequestInit = {
          method, mode: 'cors', credentials: 'omit',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        };
        const response = await fetch(url, fetchOptions);
        const text = await response.text();
        const cleanedText = cleanJsonResponse(text);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        try { 
          const trimmed = (cleanedText || '').trim();
          if (!trimmed || trimmed === '' || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
             if (url.includes('api_orders.php')) return { order_items: [], orders_info: [] };
             if (url.includes('api_tables.php')) return { tables: [], waiter_calls: [] };
             return {};
          }
          return JSON.parse(cleanedText); 
        } catch (e) { 
          if (url.includes('api_orders.php')) return { order_items: [], orders_info: [] };
          throw new Error("Could not read server response."); 
        }
      }
    } catch (err: any) { throw err; }
  };

  const fetchTables = useCallback(async (silent = false) => {
    if (!API_ENABLED || !stateRef.current.rsId) return;
    if (!silent) setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_tables.php`, {
        body: JSON.stringify({ rs_id: stateRef.current.rsId })
      });
      
      const tableData: any[] = response?.tables || [];
      const waiterCalls: WaiterCall[] = response?.waiter_calls || [];

      // Detect new waiter calls
      waiterCalls.forEach(call => {
        if (!seenCallIds.has(call.order_waiter_call_id)) {
          triggerNotification(call);
          setSeenCallIds(prev => new Set(prev).add(call.order_waiter_call_id));
        }
      });

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
      
      setState(prev => ({ ...prev, tables: mappedTables, waiterCalls }));
      setSyncError(false);
    } catch (err: any) {
      setSyncError(true);
      if (!silent) setErrorStatus(`Table Sync: ${err.message}`);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [seenCallIds, triggerNotification]);

  const fetchOrders = useCallback(async (tableNo: string, masterOrderId?: string | null, silent = false) => {
    if (!API_ENABLED || !stateRef.current.rsId) return;
    if (!silent) setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_orders.php`, {
        body: JSON.stringify({ table_no: tableNo, rs_id: stateRef.current.rsId, master_order_id: masterOrderId || '' })
      });
      let orderItems: any[] = response?.order_items || [];
      let orderInfo: OrderInfo | null = response?.orders_info?.[0] || null;
      const mappedOrders: OrderItem[] = orderItems.map((o: any) => {
        let mappedStatus = OrderStatus.CONFIRMED;
        const apiStatus = String(o.order_item_status || '').toLowerCase();
        if (apiStatus.includes('initial') || apiStatus.includes('cart')) mappedStatus = OrderStatus.CART;
        else if (apiStatus.includes('placed')) mappedStatus = OrderStatus.OCCUPIED;
        else if (apiStatus.includes('delivered') || apiStatus.includes('prepared')) mappedStatus = OrderStatus.PREPARED;
        const prefRawString = o.food_preferencess_names || '';
        const uniquePrefNames: string[] = Array.from(new Set<string>(prefRawString.split('@').map((p: string) => p.trim()).filter(Boolean)));
        const mappedPreferences = uniquePrefNames.map((p: string) => ({ name: p, price: 0 }));
        return {
          id: String(o.id || ''),
          food_id: String(o.Item_Id || o.food_id || ''), 
          food_name: String(o.menu_item_name || o.food_name || o.Item_Name || o.item_name || 'Item'),
          food_item_price: Number(o.food_item_price || 0),
          food_quantity: Number(o.food_quantity || 1),
          status: mappedStatus,
          sub_id: String(o.sub_id || ''),
          master_order_id: String(o.order_id || o.master_order_id || ''),
          preferences: mappedPreferences,
          order_taken_by: o.order_taken_by || 'Staff',
          note: o.food_note || o.note || '',
          food_type: o.food_type,
          food_image: o.food_image || o.Image_Thumb || o.image_thumb || ''
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

  const fetchMenu = useCallback(async () => {
    if (!stateRef.current.rsId) return;
    setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_menu.php`, { body: JSON.stringify({ rs_id: stateRef.current.rsId }) });
      const rawItems = response?.items || [];
      const mappedItems: MenuItem[] = rawItems.map((item: any) => ({
        ...item,
        food_name: String(item.menu_item_name || item.food_name || item.Item_Name || item.item_name || 'Item'),
        Image_Thumb: item.Image_Thumb || item.image_thumb || '',
        Image_Large: item.Image_Large || item.image_large || ''
      }));
      setCategories(response?.categories || []);
      setMenuItems(mappedItems);
    } catch (err: any) { setErrorStatus(`Menu Sync: ${err.message}`); } finally { setIsLoading(false); }
  }, []);

  const fetchItemPreferences = useCallback(async (foodId: string): Promise<ItemPreference[]> => {
    if (!stateRef.current.rsId || !foodId) return [];
    try {
      const response = await makeRequest(`${API_BASE_URL}api_item_preferencess.php`, { body: JSON.stringify({ rs_id: stateRef.current.rsId, food_id: foodId, item_id: foodId, Item_Id: foodId }) });
      const prefsList = response?.preferencess || response?.item_preferencess || (Array.isArray(response) ? response : []);
      return prefsList.map((p: any) => ({
        id: String(p.p_id || p.id || Math.random().toString(36).substr(2, 9)),
        name: String(p.p_name || p.food_preferencess || p.name || '')
      })).filter((p: any) => p.name);
    } catch (err) { return []; }
  }, []);

  useEffect(() => {
    if (state.view === 'splash') {
      setTimeout(() => setState(prev => ({ ...prev, view: prev.isAuthenticated ? 'main' : 'login' })), 2000);
    }
  }, [state.view]);

  useEffect(() => {
    if (state.view === 'main' && !state.currentTable && state.rsId) fetchTables();
  }, [state.view, state.currentTable, state.rsId, fetchTables]);

  useEffect(() => {
    if (state.currentTable) {
      const t = state.tables.find(tbl => tbl.table_no === state.currentTable);
      fetchOrders(state.currentTable, t?.master_order_id);
      fetchMenu();
    }
  }, [state.currentTable, fetchMenu, fetchOrders, state.tables]);

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
  }, [state.isAuthenticated, state.view, state.rsId, fetchTables, fetchOrders]);

  const handleLogin = async (user: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_auth.php`, { body: JSON.stringify({ username: user, password: pass }) });
      const userData = response.user || {};
      const rsId = String(userData.rs_id || response.rs_id || '');
      if ((response.success === true || response.status === 'success') && rsId) {
        setState(prev => ({ ...prev, isAuthenticated: true, rsId, user: { id: String(userData.id || ''), name: userData.name || user, role: userData.user_type === '1' ? 'Admin' : 'Staff', restaurantName: userData.restaurant_name }, view: 'main' }));
        window.location.hash = '/dashboard';
        return true;
      }
      throw new Error(response.message || 'Login failed');
    } catch (err: any) { setErrorStatus(err.message); return false; } finally { setIsLoading(false); }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false, view: 'login', currentTable: null, user: { id: null, name: null, role: null, restaurantName: null }, rsId: null }));
    localStorage.removeItem('dinesync_state_v2');
    window.location.hash = '/';
  };

  const handleSelectTable = (tableNo: string) => { window.location.hash = `/table/${tableNo}`; };
  const handleBackToDashboard = useCallback(() => {
    window.location.hash = '/dashboard';
    if (stateRef.current.currentTable !== null) {
      setState(prev => ({ ...prev, currentTable: null, orders: [], orderInfo: null }));
    }
  }, []);

  // Handle PWA manual installation trigger
  const handleInstallClick = useCallback(() => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      }
      setDeferredPrompt(null);
    });
  }, [deferredPrompt]);

  const handleRefreshCurrentTable = async () => {
    if (state.currentTable) {
      const t = state.tables.find(tbl => tbl.table_no === state.currentTable);
      await fetchOrders(state.currentTable, t?.master_order_id);
    }
  };

  const handleAddItem = async (foodId: string, quantity: number, preferences: string, waiterCode: string) => {
    if (!state.rsId || !state.currentTable) return false;
    setIsLoading(true);
    try {
      const currentT = state.tables.find(t => t.table_no === state.currentTable);
      const mId = state.orderInfo?.master_order_id || currentT?.master_order_id || '';
      await makeRequest(`${API_BASE_URL}api_add_item.php`, { body: JSON.stringify({ rs_id: state.rsId, table_no: state.currentTable, food_id: foodId, food_quantity: quantity, food_preferencess: preferences, waiter_code: waiterCode, master_order_id: mId }) });
      fetchOrders(state.currentTable, mId);
      return true;
    } catch (err: any) { setErrorStatus(`Add Item failed: ${err.message}`); return false; } finally { setIsLoading(false); }
  };

  const handleDeleteItem = async (itemId: string, waiterCode: string) => {
    if (!state.rsId) return false;
    setIsLoading(true);
    try {
      const currentT = state.tables.find(t => t.table_no === state.currentTable);
      const mId = state.orderInfo?.master_order_id || currentT?.master_order_id || '';
      await makeRequest(`${API_BASE_URL}api_delete_item.php`, { body: JSON.stringify({ rs_id: state.rsId, id: itemId, waiter_code: waiterCode, master_order_id: mId }) });
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
      await makeRequest(`${API_BASE_URL}api_confirm_order.php`, { body: JSON.stringify({ rs_id: state.rsId, id: itemId, waiter_code: waiterCode, note, master_order_id: mId }) });
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
      await makeRequest(`${API_BASE_URL}api_edit_item.php`, { body: JSON.stringify({ rs_id: state.rsId, master_order_id: mId, id: itemId, food_quantity: quantity, food_preferencess: preferences }) });
      if (state.currentTable) fetchOrders(state.currentTable, mId);
      return true;
    } catch (err: any) { setErrorStatus(`Edit failed: ${err.message}`); return false; } finally { setIsLoading(false); }
  };

  const handleConfirmAllItems = async (waiterCode: string, note: string) => {
    if (!state.rsId || !state.currentTable) return false;
    setIsLoading(true);
    try {
      const currentT = state.tables.find(t => t.table_no === state.currentTable);
      const mId = state.orderInfo?.master_order_id || currentT?.master_order_id || '';
      await makeRequest(`${API_BASE_URL}api_confirm_all_items.php`, { body: JSON.stringify({ rs_id: state.rsId, master_order_id: mId, waiter_code: waiterCode, note }) });
      fetchOrders(state.currentTable, mId);
      return true;
    } catch (err: any) { setErrorStatus(`Bulk Confirm failed: ${err.message}`); return false; } finally { setIsLoading(false); }
  };

  const handleConfirmOrder = async (tableNo: string, waiterCode: string, note: string) => {
    if (!state.rsId) return false;
    setIsLoading(true);
    try {
      const t = state.tables.find(tbl => tbl.table_no === tableNo);
      await makeRequest(`${API_BASE_URL}api_confirm_order.php`, { body: JSON.stringify({ rs_id: state.rsId, table_no: tableNo, waiter_code: waiterCode, note, master_order_id: t?.master_order_id || '' }) });
      fetchOrders(tableNo, t?.master_order_id);
      return true;
    } catch (err: any) { setErrorStatus(`Table Confirm failed: ${err.message}`); return false; } finally { setIsLoading(false); }
  };

  const handleCreateOrder = async (tableNo: string, waiterCode: string, waiterPass: string, guestNos: number) => {
    if (!stateRef.current.rsId) return false;
    setIsLoading(true);
    try {
      const response = await makeRequest(`${API_BASE_URL}api_order_create.php`, { body: JSON.stringify({ code: waiterCode, password: waiterPass, table: tableNo, guest_nos: guestNos, rs_id: stateRef.current.rsId }) });
      if (response.success === true || response.status === 'success') { await fetchTables(); handleSelectTable(tableNo); return true; }
      throw new Error(response.message || 'Failed to create order.');
    } catch (err: any) { setErrorStatus(`Order Creation: ${err.message}`); return false; } finally { setIsLoading(false); }
  };

  const handleAcknowledgeCall = (callId: string) => {
    // In a real app, you might send this back to the API. 
    // Here we just remove it from seen state or active list locally.
    setActiveNotifications(prev => prev.filter(c => c.order_waiter_call_id !== callId));
  };

  if (state.view === 'splash') return <SplashScreen />;
  if (state.view === 'login') return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden">
      {/* In-App Notification Overlay */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[100] pointer-events-none space-y-3">
        {activeNotifications.map((call) => (
          <div 
            key={call.order_waiter_call_id} 
            className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 pointer-events-auto animate-in slide-in-from-top-full fade-in duration-500 ring-4 ring-indigo-500/20"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 animate-bounce">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Table {call.table_no}</h4>
              <p className="text-sm font-bold truncate">{call.call_info || 'Service Request'}</p>
            </div>
            <button 
              onClick={() => handleAcknowledgeCall(call.order_waiter_call_id)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {isLoading && <div className="fixed top-0 left-0 w-full h-1 bg-indigo-500 z-[70] overflow-hidden"><div className="w-full h-full bg-indigo-300 animate-[loading_1.5s_infinite]"></div></div>}
      
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center px-4 py-3 bg-white border-b border-slate-100 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-sm">{state.user.name?.[0] || 'U'}</span>
          </div>
          <div className="text-right ml-4">
            <p className="text-[9px] font-black text-indigo-500 uppercase">Sync</p>
            <p className="text-xs font-black text-slate-600">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!state.currentTable && (
            <button onClick={() => fetchTables()} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl">
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="3" />
              </svg>
            </button>
          )}
          <button onClick={handleLogout} className="bg-slate-900 text-white text-[10px] font-black uppercase px-4 py-2.5 rounded-xl">Log Out</button>
        </div>
      </div>
      
      <main className="flex-grow overflow-y-auto">
        {state.currentTable ? (
          <TableView 
            table={state.tables.find(t => t.table_no === state.currentTable) || { table_no: state.currentTable, status: 'inactive', guest_count: 0, tax: 0 }}
            orders={state.orders}
            orderInfo={state.orderInfo}
            categories={categories}
            menuItems={menuItems}
            onBack={handleBackToDashboard}
            onAddItem={handleAddItem}
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
            waiterCalls={state.waiterCalls}
            onSelectTable={handleSelectTable} 
            onCreateOrder={handleCreateOrder}
            restaurantName={state.user.restaurantName} 
            onInstall={handleInstallClick} 
            isOnline={isOnline}
            syncError={syncError}
            onAcknowledgeCall={handleAcknowledgeCall}
          />
        )}
      </main>
      <footer className="py-4 text-center bg-white border-t border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sync: <span className="text-slate-800">{state.rsId}</span></p>
      </footer>
    </div>
  );
};

export default App;
