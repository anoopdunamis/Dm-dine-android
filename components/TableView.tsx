
import React, { useState } from 'react';
import { Table, OrderItem, OrderStatus } from '../types';
import VerificationModal from './VerificationModal';

interface TableViewProps {
  table: Table;
  orders: OrderItem[];
  onBack: () => void;
  onDelete: (id: string, code: string) => boolean;
  onConfirm: (tableNo: string, code: string, note: string) => boolean;
}

const TableView: React.FC<TableViewProps> = ({ table, orders, onBack, onDelete, onConfirm }) => {
  const [modalType, setModalType] = useState<'delete' | 'confirm' | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const cartItems = orders.filter(o => o.status === OrderStatus.CART);
  const confirmedItems = orders.filter(o => o.status === OrderStatus.CONFIRMED);
  const preparedItems = orders.filter(o => o.status === OrderStatus.PREPARED);

  const calculateTotal = (items: OrderItem[]) => items.reduce((sum, item) => sum + (item.food_item_price * item.food_quantity), 0);
  
  const cartTotal = calculateTotal(cartItems);
  const confirmedTotal = calculateTotal(confirmedItems);
  const preparedTotal = calculateTotal(preparedItems);
  const grandTotal = cartTotal + confirmedTotal + preparedTotal + table.tax;

  const handleAction = (code: string, note?: string) => {
    if (modalType === 'delete' && targetId) {
      if (onDelete(targetId, code)) {
        setModalType(null);
        setTargetId(null);
      } else {
        alert('Invalid Waiter Code');
      }
    } else if (modalType === 'confirm') {
      if (onConfirm(table.table_no, code, note || '')) {
        setModalType(null);
      } else {
        alert('Invalid Waiter Code');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold">Table {table.table_no}</h2>
          <p className="text-xs text-slate-500 font-medium">Guests: {table.guest_count || 'N/A'}</p>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="p-4 space-y-6">
        {/* Cart Section */}
        {cartItems.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 flex justify-between items-center border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Cart</span>
              <span className="text-xs font-bold text-slate-400">COURSE 1</span>
            </div>
            <div className="divide-y divide-slate-50">
              {cartItems.map(item => (
                <div key={item.id} className="p-6 flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{item.food_name}</span>
                        <span className="text-slate-400 font-medium">×{item.food_quantity}</span>
                    </div>
                    {item.preferences.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.preferences.map((p, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium italic">
                            {p.name} {p.price > 0 && `(+${p.price})`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-bold text-slate-900">AED {item.food_item_price * item.food_quantity}</span>
                    <button 
                      onClick={() => { setTargetId(item.id); setModalType('delete'); }}
                      className="mt-2 text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Cart Subtotal</p>
                <p className="text-xl font-black text-slate-900">AED {cartTotal}</p>
              </div>
              <button 
                onClick={() => setModalType('confirm')}
                className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all"
              >
                Confirm Order
              </button>
            </div>
          </section>
        )}

        {/* Confirmed Section */}
        {confirmedItems.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-orange-50 px-6 py-3 flex justify-between items-center border-b border-orange-100">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Confirmed</span>
              <span className="text-xs font-bold text-orange-400">COURSE 1</span>
            </div>
            <div className="divide-y divide-slate-50 opacity-80">
              {confirmedItems.map(item => (
                <div key={item.id} className="p-6 flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{item.food_name}</span>
                        <span className="text-slate-400 font-medium">×{item.food_quantity}</span>
                    </div>
                    {item.note && <p className="mt-1 text-xs text-indigo-600 font-medium">Note: {item.note}</p>}
                    <p className="mt-2 text-[10px] text-slate-400 font-medium">Taken by {item.order_taken_by}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">AED {item.food_item_price * item.food_quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prepared Section */}
        {preparedItems.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-emerald-50 px-6 py-3 flex justify-between items-center border-b border-emerald-100">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Prepared</span>
              <span className="text-xs font-bold text-emerald-400">READY</span>
            </div>
            <div className="divide-y divide-slate-50">
              {preparedItems.map(item => (
                <div key={item.id} className="p-6 flex justify-between items-start gap-4">
                   <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{item.food_name}</span>
                        <span className="text-slate-400 font-medium">×{item.food_quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">AED {item.food_item_price * item.food_quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Summary Footer */}
        <div className="mt-10 p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
            <span className="text-slate-400 font-medium">Tax (Service Charge)</span>
            <span className="font-bold">AED {table.tax}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">Grand Total</span>
            <span className="text-3xl font-black text-orange-400 tracking-tighter">AED {grandTotal}</span>
          </div>
        </div>
      </div>

      {modalType && (
        <VerificationModal 
          type={modalType}
          onClose={() => setModalType(null)}
          onConfirm={handleAction}
        />
      )}
    </div>
  );
};

export default TableView;
