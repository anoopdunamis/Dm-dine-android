import React, { useState, useRef, useEffect } from 'react';
import { Table, OrderItem, OrderStatus, OrderInfo, ItemPreference } from '../types';
import VerificationModal from './VerificationModal';
import EditItemModal from './EditItemModal';

interface TableViewProps {
  table: Table;
  orders: OrderItem[];
  orderInfo: OrderInfo | null;
  onBack: () => void;
  onDelete: (id: string, code: string) => Promise<boolean> | boolean;
  onConfirm: (tableNo: string, code: string, note: string) => Promise<boolean> | boolean;
  onConfirmItem: (id: string, code: string, note: string) => Promise<boolean> | boolean;
  onEditItem: (id: string, quantity: number, preferences: string) => Promise<boolean> | boolean;
  onFetchItemPreferences: (foodId: string) => Promise<ItemPreference[]>;
  onConfirmAll: (code: string, note: string) => Promise<boolean> | boolean;
  onRefresh: () => Promise<void>;
}

const TableView: React.FC<TableViewProps> = ({ 
  table, 
  orders, 
  orderInfo, 
  onBack, 
  onDelete, 
  onConfirm, 
  onConfirmItem, 
  onEditItem,
  onFetchItemPreferences,
  onConfirmAll,
  onRefresh
}) => {
  const [modalType, setModalType] = useState<'delete' | 'confirm' | 'confirm_item' | 'confirm_all' | 'edit' | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Pull to refresh states
  const [pullOffset, setPullOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  // International Currency Formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const cartItems = orders.filter(o => o.status === OrderStatus.CART);
  const activeItems = orders.filter(o => o.status !== OrderStatus.CART);
  const hasPlacedItems = activeItems.some(item => item.status === OrderStatus.OCCUPIED);

  const calculateTotal = (items: OrderItem[]) => items.reduce((sum, item) => sum + (item.food_item_price * item.food_quantity), 0);
  
  const cartTotal = calculateTotal(cartItems);
  const activeTotal = calculateTotal(activeItems);
  const taxValue = Number(orderInfo?.tax || table.tax || 0);
  const grandTotal = cartTotal + activeTotal + taxValue;

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollContainer = e.currentTarget.closest('main') || document.documentElement;
    if (scrollContainer.scrollTop <= 0) {
      startY.current = e.touches[0].pageY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance
      const offset = Math.min(diff * 0.4, 100);
      setPullOffset(offset);
      
      // Prevent scrolling while pulling
      if (offset > 10) {
        if (e.cancelable) e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullOffset > 70) {
      setIsRefreshing(true);
      setPullOffset(60);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullOffset(0);
      }
    } else {
      setPullOffset(0);
    }
  };

  const handleAction = async (code: string, note?: string) => {
    setIsProcessing(true);
    try {
        if (modalType === 'delete' && targetId) {
          if (await onDelete(targetId, code)) {
            setModalType(null);
            setTargetId(null);
          }
        } else if (modalType === 'confirm_item' && targetId) {
          if (await onConfirmItem(targetId, code, note || '')) {
            setModalType(null);
            setTargetId(null);
          }
        } else if (modalType === 'confirm_all') {
          if (await onConfirmAll(code, note || '')) {
            setModalType(null);
          }
        } else if (modalType === 'confirm') {
          if (await onConfirm(table.table_no, code, note || '')) {
            setModalType(null);
          }
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const handleEditSubmit = async (quantity: number, preferences: string) => {
    if (!targetId) return;
    setIsProcessing(true);
    try {
      if (await onEditItem(targetId, quantity, preferences)) {
        setModalType(null);
        setTargetId(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isPaid = orderInfo?.payment_status?.toLowerCase().includes('paid') && !orderInfo?.payment_status?.toLowerCase().includes('not');
  const targetItem = orders.find(o => o.id === targetId);

  return (
    <div 
      className="max-w-3xl mx-auto min-h-full bg-slate-50 flex flex-col relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-0 overflow-hidden transition-all duration-300 ease-out"
        style={{ height: `${pullOffset}px`, opacity: pullOffset / 70 }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className={`p-2 bg-indigo-100 rounded-full text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullOffset * 4}deg)` }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
            {isRefreshing ? 'Syncing...' : pullOffset > 70 ? 'Release' : 'Pull to Sync'}
          </span>
        </div>
      </div>

      <div 
        className="flex-grow flex flex-col transition-transform duration-300 ease-out z-10 bg-slate-50"
        style={{ transform: `translateY(${pullOffset}px)` }}
      >
        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-100">
          <div className="p-3 sm:p-4 flex items-center justify-between">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-600 rounded-full transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center flex-1">
              <h2 className="text-lg sm:text-xl font-black">Table {table.table_no}</h2>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                 <span className="text-[10px] text-slate-400 font-black uppercase">Guests: {table.guest_count || '??'}</span>
                 <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                 <span className="text-[10px] text-indigo-500 font-black uppercase">ID: {orderInfo?.master_order_id || 'NEW'}</span>
              </div>
            </div>
            <div className="w-10"></div>
          </div>
          <div className="flex divide-x divide-slate-100 bg-slate-50 border-t border-slate-100">
            <div className="flex-1 px-4 py-2.5">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Payment</p>
               <span className={`text-[10px] font-black uppercase flex items-center gap-1.5 ${isPaid ? 'text-emerald-600' : 'text-rose-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                  {orderInfo?.payment_status || 'Unpaid'}
               </span>
            </div>
            <div className="flex-1 px-4 py-2.5">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Placed</p>
               <span className="text-[10px] font-black text-slate-700">{orderInfo?.placed_time?.split(' ')[1] || '--:--'}</span>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-6 space-y-4 flex-grow">
          {/* Cart/Draft Items */}
          {cartItems.length > 0 && (
            <section className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden ring-4 ring-indigo-50/50">
              <div className="bg-indigo-600 px-5 py-3 flex justify-between items-center text-white">
                <span className="text-[10px] font-black uppercase tracking-widest">New Items (Cart)</span>
                <span className="text-[10px] font-black opacity-70">DRAFT</span>
              </div>
              <div className="divide-y divide-slate-50">
                {cartItems.map(item => (
                  <div key={item.id} className="p-5 flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900">{item.food_name} <span className="text-slate-400">×{item.food_quantity}</span></span>
                      {/* Item Preferences */}
                      {item.preferences && item.preferences.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.preferences.map((pref, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {pref.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="font-black text-slate-900">{formatCurrency(item.food_item_price * item.food_quantity)}</span>
                      <div className="flex gap-2 mt-2">
                        {/* Edit button removed from Cart as per "only for placed order items" request */}
                        <button onClick={() => { setTargetId(item.id); setModalType('delete'); }} className="text-[9px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl uppercase">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xl font-black">{formatCurrency(cartTotal)}</p>
                <button onClick={() => setModalType('confirm')} className="bg-slate-900 text-white text-xs font-black px-6 py-3.5 rounded-2xl uppercase tracking-widest">Send All</button>
              </div>
            </section>
          )}

          {/* Confirmed/Placed Items */}
          {activeItems.length > 0 ? (
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 px-5 py-3 flex justify-between items-center text-white">
                <span className="text-[10px] font-black uppercase tracking-widest">Order Details</span>
                <div className="flex items-center gap-2">
                  {hasPlacedItems && (
                    <button 
                      onClick={() => setModalType('confirm_all')}
                      className="text-[9px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg uppercase tracking-tight transition-colors"
                    >
                      Confirm All
                    </button>
                  )}
                  <span className="text-[10px] font-black border border-white/20 px-2 py-0.5 rounded-lg">LIVE</span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {activeItems.map(item => (
                  <div key={item.id} className="p-5 flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                         <div className={`w-2 h-2 rounded-full ${item.status === OrderStatus.PREPARED ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                         <span className="text-[9px] font-black text-slate-400 uppercase">{item.status}</span>
                      </div>
                      <p className="font-bold text-slate-900 text-lg">{item.food_name} <span className="text-slate-400">×{item.food_quantity}</span></p>
                      
                      {/* Item Preferences */}
                      {item.preferences && item.preferences.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.preferences.map((pref, idx) => (
                            <span key={idx} className="bg-slate-50 text-slate-400 border border-slate-100 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {pref.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.note && <p className="mt-2 p-2 bg-indigo-50 rounded-xl text-[10px] text-indigo-600 font-bold italic">{item.note}</p>}
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="font-black text-slate-900">{formatCurrency(item.food_item_price * item.food_quantity)}</span>
                      <div className="flex flex-wrap justify-end gap-2 mt-3">
                        {/* Edit is only allowed for placed order items (OrderStatus.OCCUPIED) */}
                        {item.status === OrderStatus.OCCUPIED && (
                          <button onClick={() => { setTargetId(item.id); setModalType('edit'); }} className="text-[9px] font-black text-indigo-600 border border-indigo-100 px-3 py-2 rounded-xl bg-white uppercase">Edit</button>
                        )}
                        <button onClick={() => { setTargetId(item.id); setModalType('delete'); }} className="text-[9px] font-black text-rose-500 border border-rose-100 px-3 py-2 rounded-xl bg-white uppercase">Delete</button>
                        {item.status === OrderStatus.OCCUPIED && (
                          <button onClick={() => { setTargetId(item.id); setModalType('confirm_item'); }} className="text-[9px] font-black text-emerald-600 border border-emerald-100 px-3 py-2 rounded-xl bg-white uppercase">Confirm</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : !cartItems.length && (
              <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-indigo-50/50">
                  <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Ready for Service</h3>
                <p className="text-slate-400 text-sm font-medium max-w-[240px] text-center px-4 leading-relaxed">
                  This table is currently clear. Start adding delicious items to begin a new guest order!
                </p>
                <div className="mt-8 flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 animate-bounce delay-200"></div>
                </div>
              </div>
          )}

          {/* Bill Total Card */}
          {(activeItems.length > 0 || cartItems.length > 0) && (
            <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
              <div className="flex justify-between items-center text-xs opacity-60 mb-1 font-bold uppercase tracking-widest">
                <span>Subtotal</span>
                <span>{formatCurrency(activeTotal + cartTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs opacity-60 mb-4 font-bold uppercase tracking-widest">
                <span>Tax/Service</span>
                <span>{formatCurrency(taxValue)}</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-white/50 font-black uppercase mb-1">Total Bill</p>
                  <h3 className="text-2xl font-black tracking-tight">Grand Total</h3>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-indigo-400 tracking-tighter">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalType === 'edit' && targetItem && (
        <EditItemModal 
          item={targetItem}
          onClose={() => !isProcessing && setModalType(null)}
          onConfirm={handleEditSubmit}
          onFetchPreferences={onFetchItemPreferences}
          isLoading={isProcessing}
        />
      )}

      {(modalType && modalType !== 'edit') && (
        <VerificationModal 
          type={(modalType === 'confirm' || modalType === 'confirm_item' || modalType === 'confirm_all') ? 'confirm' : 'delete'}
          onClose={() => !isProcessing && setModalType(null)}
          onConfirm={handleAction}
        />
      )}
      <div className="h-6 safe-bottom"></div>
    </div>
  );
};

export default TableView;