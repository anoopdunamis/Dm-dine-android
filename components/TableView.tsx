import React, { useState } from 'react';
import { Table, OrderItem, OrderStatus, OrderInfo } from '../types';
import VerificationModal from './VerificationModal';

interface TableViewProps {
  table: Table;
  orders: OrderItem[];
  orderInfo: OrderInfo | null;
  onBack: () => void;
  onDelete: (id: string, code: string) => Promise<boolean> | boolean;
  onConfirm: (tableNo: string, code: string, note: string) => Promise<boolean> | boolean;
  onConfirmItem: (id: string, code: string, note: string) => Promise<boolean> | boolean;
}

const TableView: React.FC<TableViewProps> = ({ table, orders, orderInfo, onBack, onDelete, onConfirm, onConfirmItem }) => {
  const [modalType, setModalType] = useState<'delete' | 'confirm' | 'confirm_item' | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const cartItems = orders.filter(o => o.status === OrderStatus.CART);
  const activeItems = orders.filter(o => o.status !== OrderStatus.CART);

  const calculateTotal = (items: OrderItem[]) => items.reduce((sum, item) => sum + (item.food_item_price * item.food_quantity), 0);
  
  const cartTotal = calculateTotal(cartItems);
  const activeTotal = calculateTotal(activeItems);
  const taxValue = Number(orderInfo?.tax || table.tax || 0);
  const grandTotal = cartTotal + activeTotal + taxValue;

  const handleAction = async (code: string, note?: string) => {
    setIsProcessing(true);
    try {
        if (modalType === 'delete' && targetId) {
          const success = await onDelete(targetId, code);
          if (success) {
            setModalType(null);
            setTargetId(null);
          }
        } else if (modalType === 'confirm_item' && targetId) {
          const success = await onConfirmItem(targetId, code, note || '');
          if (success) {
            setModalType(null);
            setTargetId(null);
          }
        } else if (modalType === 'confirm') {
          const success = await onConfirm(table.table_no, code, note || '');
          if (success) {
            setModalType(null);
          }
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const isPaid = orderInfo?.payment_status?.toLowerCase().includes('paid') && !orderInfo?.payment_status?.toLowerCase().includes('not');

  return (
    <div className="max-w-3xl mx-auto min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-100">
        <div className="p-3 sm:p-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 active:bg-slate-100 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center flex-1 px-2 overflow-hidden">
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Table {table.table_no}</h2>
            <div className="flex items-center justify-center gap-2 mt-0.5">
               <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Guests: {table.guest_count || '??'}</span>
               <div className="w-1 h-1 rounded-full bg-slate-300"></div>
               <span className="text-[10px] text-indigo-500 font-black uppercase tracking-wider">ID: {orderInfo?.master_order_id || 'PENDING'}</span>
            </div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Order Status Bar */}
        <div className="flex divide-x divide-slate-100 bg-slate-50 border-t border-slate-100">
          <div className="flex-1 px-4 py-2.5">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Payment</p>
             <span className={`text-[11px] font-black uppercase flex items-center gap-1.5 ${isPaid ? 'text-emerald-600' : 'text-rose-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                {orderInfo?.payment_status || 'Not Paid'}
             </span>
          </div>
          <div className="flex-1 px-4 py-2.5">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Entry Time</p>
             <span className="text-[11px] font-black text-slate-700 uppercase">
                {orderInfo?.placed_time?.split(' ')[1] || '--:--'}
             </span>
          </div>
          <div className="flex-1 px-4 py-2.5">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Type</p>
             <span className="text-[11px] font-black text-indigo-600 uppercase">
                {orderInfo?.order_type === '1' ? 'Dine In' : 'Takeaway'}
             </span>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 flex-grow">
        {/* Cart Section (Drafts) */}
        {cartItems.length > 0 && (
          <section className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden ring-4 ring-indigo-50/50">
            <div className="bg-indigo-600 px-5 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">New Items</span>
              </div>
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">DRAFT</span>
            </div>
            <div className="divide-y divide-slate-50">
              {cartItems.map(item => (
                <div key={item.id} className="p-5 flex justify-between items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.food_type && (
                         <div className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase ${item.food_type.toLowerCase() === 'veg' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-rose-200 text-rose-600 bg-rose-50'}`}>
                            {item.food_type}
                         </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold text-lg text-slate-900 break-words">{item.food_name}</span>
                        <span className="text-slate-400 font-black text-sm">×{item.food_quantity}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end flex-shrink-0">
                    <span className="font-black text-slate-900 text-base">AED {item.food_item_price * item.food_quantity}</span>
                    <button 
                      onClick={() => { setTargetId(item.id); setModalType('delete'); }}
                      className="mt-2 text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 bg-slate-50 flex items-center justify-between gap-4 border-t border-slate-100">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Draft Sum</p>
                <p className="text-xl font-black text-slate-900">AED {cartTotal}</p>
              </div>
              <button 
                onClick={() => setModalType('confirm')}
                className="flex-1 max-w-[200px] bg-slate-900 text-white text-sm font-black py-4 px-6 rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all uppercase tracking-widest"
              >
                Place Order
              </button>
            </div>
          </section>
        )}

        {/* Active Items Section */}
        {activeItems.length > 0 ? (
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 px-5 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmed Items</span>
              <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-lg bg-indigo-600 uppercase">Active</span>
            </div>
            <div className="divide-y divide-slate-50">
              {activeItems.map(item => (
                <div key={item.id} className="p-5 flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <div className={`w-2 h-2 rounded-full ${item.status === OrderStatus.PREPARED ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.status}</span>
                       {item.food_type && (
                         <span className={`text-[8px] font-black uppercase ml-1 ${item.food_type.toLowerCase() === 'veg' ? 'text-emerald-500' : 'text-rose-500'}`}>• {item.food_type}</span>
                       )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold text-lg text-slate-900 break-words">{item.food_name}</span>
                        <span className="text-slate-400 font-black">×{item.food_quantity}</span>
                    </div>
                    {item.note && (
                      <div className="mt-2 p-2 bg-indigo-50 rounded-xl flex items-start gap-2">
                        <svg className="w-3 h-3 text-indigo-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        <p className="text-[11px] text-indigo-600 font-bold italic leading-tight">{item.note}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end flex-shrink-0">
                    <span className="font-black text-slate-900 text-base">AED {item.food_item_price * item.food_quantity}</span>
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => { setTargetId(item.id); setModalType('delete'); }}
                        className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest border border-rose-100 hover:border-rose-200 px-3 py-1.5 rounded-xl active:scale-95 transition-all bg-white"
                      >
                        Delete
                      </button>
                      {item.status === OrderStatus.OCCUPIED && (
                        <button 
                          onClick={() => { setTargetId(item.id); setModalType('confirm_item'); }}
                          className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest border border-indigo-100 hover:border-indigo-200 px-3 py-1.5 rounded-xl active:scale-95 transition-all bg-white"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          !cartItems.length && (
            <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active orders</p>
            </div>
          )
        )}

        {/* Totals Breakdown */}
        {(activeItems.length > 0 || cartItems.length > 0) && (
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-500">
               <span className="uppercase tracking-widest text-[10px]">Subtotal Items</span>
               <span className="text-slate-900">AED {activeTotal + cartTotal}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-slate-500">
               <span className="uppercase tracking-widest text-[10px]">Tax & Service</span>
               <span className="text-slate-900">AED {taxValue}</span>
            </div>
            <div className="pt-3 border-t border-slate-50 flex justify-between items-end">
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Current Bill</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Grand Total</h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-indigo-600 tracking-tighter">AED {grandTotal}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalType && (
        <VerificationModal 
          type={(modalType === 'confirm' || modalType === 'confirm_item') ? 'confirm' : 'delete'}
          onClose={() => !isProcessing && setModalType(null)}
          onConfirm={handleAction}
        />
      )}
      
      <div className="h-6 safe-bottom"></div>
    </div>
  );
};

export default TableView;