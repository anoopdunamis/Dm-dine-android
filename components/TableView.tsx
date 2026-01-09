
import React, { useState } from 'react';
import { Table, OrderItem, OrderStatus } from '../types';
import VerificationModal from './VerificationModal';

interface TableViewProps {
  table: Table;
  orders: OrderItem[];
  onBack: () => void;
  onDelete: (id: string, code: string) => Promise<boolean> | boolean;
  onConfirm: (tableNo: string, code: string, note: string) => Promise<boolean> | boolean;
}

const TableView: React.FC<TableViewProps> = ({ table, orders, onBack, onDelete, onConfirm }) => {
  const [modalType, setModalType] = useState<'delete' | 'confirm' | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const cartItems = orders.filter(o => o.status === OrderStatus.CART);
  const confirmedItems = orders.filter(o => o.status === OrderStatus.CONFIRMED);
  const preparedItems = orders.filter(o => o.status === OrderStatus.PREPARED);

  const calculateTotal = (items: OrderItem[]) => items.reduce((sum, item) => sum + (item.food_item_price * item.food_quantity), 0);
  
  const cartTotal = calculateTotal(cartItems);
  const confirmedTotal = calculateTotal(confirmedItems);
  const preparedTotal = calculateTotal(preparedItems);
  const grandTotal = cartTotal + confirmedTotal + preparedTotal + table.tax;

  const handleAction = async (code: string, note?: string) => {
    setIsProcessing(true);
    try {
        if (modalType === 'delete' && targetId) {
          const success = await onDelete(targetId, code);
          if (success) {
            setModalType(null);
            setTargetId(null);
          } else {
            alert('Invalid Waiter Code');
          }
        } else if (modalType === 'confirm') {
          const success = await onConfirm(table.table_no, code, note || '');
          if (success) {
            setModalType(null);
          } else {
            alert('Invalid Waiter Code');
          }
        }
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 p-3 sm:p-4 flex items-center justify-between shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 active:bg-slate-100 rounded-full transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-center flex-1 px-2 overflow-hidden">
          <h2 className="text-lg sm:text-xl font-bold truncate">Table {table.table_no}</h2>
          <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Guests: {table.guest_count || 'N/A'}</p>
        </div>
        <div className="w-10"></div> {/* Spacer to center the title */}
      </div>

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 flex-grow">
        {/* Cart Section */}
        {cartItems.length > 0 && (
          <section className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-2 sm:py-3 flex justify-between items-center border-b border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Cart</span>
              <span className="text-[10px] font-black text-slate-300">DRAFT</span>
            </div>
            <div className="divide-y divide-slate-50">
              {cartItems.map(item => (
                <div key={item.id} className="p-4 sm:p-6 flex justify-between items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold text-base sm:text-lg text-slate-900 break-words">{item.food_name}</span>
                        <span className="text-slate-400 font-bold text-sm sm:text-base">×{item.food_quantity}</span>
                    </div>
                    {item.preferences.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.preferences.map((p, i) => (
                          <span key={i} className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase">
                            {p.name} {p.price > 0 && `(+${p.price})`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end flex-shrink-0">
                    <span className="font-bold text-slate-900 text-sm sm:text-base whitespace-nowrap">AED {item.food_item_price * item.food_quantity}</span>
                    <button 
                      onClick={() => { setTargetId(item.id); setModalType('delete'); }}
                      className="mt-2 text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest bg-rose-50 px-2 sm:px-3 py-1 rounded-lg active:scale-95 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 sm:p-6 bg-slate-50/50 flex items-center justify-between gap-4">
              <div className="flex-shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Draft Total</p>
                <p className="text-lg sm:text-xl font-black text-slate-900">AED {cartTotal}</p>
              </div>
              <button 
                onClick={() => setModalType('confirm')}
                className="flex-1 max-w-[180px] bg-indigo-600 text-white text-sm sm:text-base font-black py-3 px-4 rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase tracking-wider"
              >
                Confirm Order
              </button>
            </div>
          </section>
        )}

        {/* Confirmed Section */}
        {confirmedItems.length > 0 && (
          <section className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-orange-50 px-4 sm:px-6 py-2 sm:py-3 flex justify-between items-center border-b border-orange-100">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Confirmed</span>
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
            </div>
            <div className="divide-y divide-slate-50 opacity-90">
              {confirmedItems.map(item => (
                <div key={item.id} className="p-4 sm:p-6 flex justify-between items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold text-base sm:text-lg text-slate-900 break-words">{item.food_name}</span>
                        <span className="text-slate-400 font-bold">×{item.food_quantity}</span>
                    </div>
                    {item.note && (
                      <div className="mt-1 flex items-start gap-1">
                        <svg className="w-3 h-3 text-indigo-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        <p className="text-[11px] text-indigo-600 font-bold italic leading-tight">"{item.note}"</p>
                      </div>
                    )}
                    <p className="mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Taken by {item.order_taken_by}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">AED {item.food_item_price * item.food_quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prepared Section */}
        {preparedItems.length > 0 && (
          <section className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-emerald-50 px-4 sm:px-6 py-2 sm:py-3 flex justify-between items-center border-b border-emerald-100">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Prepared</span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-black">READY</span>
            </div>
            <div className="divide-y divide-slate-50">
              {preparedItems.map(item => (
                <div key={item.id} className="p-4 sm:p-6 flex justify-between items-start gap-3 sm:gap-4">
                   <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="font-bold text-base sm:text-lg text-slate-900 break-words">{item.food_name}</span>
                        <span className="text-slate-400 font-bold">×{item.food_quantity}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">AED {item.food_item_price * item.food_quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Summary Footer */}
        <div className="mt-6 sm:mt-10 p-5 sm:p-8 bg-slate-900 rounded-2xl sm:rounded-3xl text-white shadow-xl">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
            <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest">Service & Tax</span>
            <span className="font-black text-sm sm:text-base">AED {table.tax}</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <span className="block text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Final Amount</span>
              <span className="text-lg sm:text-xl font-bold">Grand Total</span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-4xl font-black text-orange-400 tracking-tighter leading-none">AED {grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {modalType && (
        <VerificationModal 
          type={modalType}
          onClose={() => !isProcessing && setModalType(null)}
          onConfirm={handleAction}
        />
      )}
      
      {/* Mobile Safe Area Bottom Spacer */}
      <div className="h-6 safe-bottom"></div>
    </div>
  );
};

export default TableView;
